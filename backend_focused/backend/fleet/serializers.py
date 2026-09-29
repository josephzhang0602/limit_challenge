from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from . import models


class UpperCaseCharField(serializers.CharField):
    """CharField that upper-cases its input.

    Normalising here (rather than in ``validate_<field>``) means the validators
    of the field, including uniqueness checks, see the normalised value.
    """

    def to_internal_value(self, data):
        return super().to_internal_value(data).upper()


class OfficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Office
        fields = ["id", "name", "city"]


class OfficeSummarySerializer(serializers.ModelSerializer):
    active_vehicle_count = serializers.IntegerField()
    maintenance_cost_last_year = serializers.DecimalField(max_digits=14, decimal_places=2)
    last_maintenance = serializers.DateField(allow_null=True)

    class Meta:
        model = models.Office
        fields = [
            "id",
            "name",
            "city",
            "active_vehicle_count",
            "maintenance_cost_last_year",
            "last_maintenance",
        ]


class MechanicSerializer(serializers.ModelSerializer):
    certification_number = UpperCaseCharField(
        max_length=64,
        validators=[
            UniqueValidator(
                queryset=models.Mechanic.objects.all(),
                message="A mechanic with this certification number already exists.",
            )
        ],
    )

    class Meta:
        model = models.Mechanic
        fields = ["id", "name", "certification_number", "is_active"]


class MechanicWorkloadSerializer(serializers.ModelSerializer):
    maintenance_count = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        model = models.Mechanic
        fields = [
            "id",
            "name",
            "certification_number",
            "is_active",
            "maintenance_count",
            "total_cost",
        ]


class VehicleSerializer(serializers.ModelSerializer):
    vin = UpperCaseCharField(
        max_length=17,
        validators=[
            models.vin_validator,
            UniqueValidator(
                queryset=models.Vehicle.objects.all(),
                message="A vehicle with this VIN already exists.",
            ),
        ],
    )
    license_plate = UpperCaseCharField(max_length=16, validators=[models.plate_validator])
    office = OfficeSerializer(read_only=True)
    office_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Office.objects.all(), source="office", write_only=True
    )
    # Annotated by VehicleQuerySet.with_last_maintenance(). A vehicle that was
    # just created has no annotation and no maintenance, so it falls back to null.
    last_maintenance = serializers.DateField(read_only=True, allow_null=True)

    class Meta:
        model = models.Vehicle
        fields = [
            "id",
            "vin",
            "license_plate",
            "make",
            "model",
            "year",
            "is_active",
            "office",
            "office_id",
            "last_maintenance",
        ]

    def validate_year(self, value):
        # Next model year vehicles are sold before the calendar year starts.
        latest = timezone.localdate().year + 1
        if value > latest:
            raise serializers.ValidationError(f"Year cannot be later than {latest}.")
        return value

    def validate(self, attrs):
        # On PATCH only some fields are sent, so fall back to the stored values
        # to validate the state the vehicle will be in after saving.
        instance = self.instance
        plate = attrs.get("license_plate", getattr(instance, "license_plate", None))
        is_active = attrs.get("is_active", getattr(instance, "is_active", True))

        if is_active and plate:
            conflicts = models.Vehicle.objects.filter(license_plate=plate, is_active=True)
            if instance is not None:
                conflicts = conflicts.exclude(pk=instance.pk)
            if conflicts.exists():
                raise serializers.ValidationError(
                    {"license_plate": "Another active vehicle already uses this license plate."}
                )
        return attrs


class VehicleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Vehicle
        fields = ["id", "vin", "license_plate", "make", "model", "year"]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle = VehicleSummarySerializer(read_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Vehicle.objects.all(), source="vehicle", write_only=True
    )
    mechanic = MechanicSerializer(read_only=True)
    mechanic_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Mechanic.objects.all(), source="mechanic", write_only=True
    )

    class Meta:
        model = models.MaintenanceRecord
        fields = [
            "id",
            "vehicle",
            "vehicle_id",
            "mechanic",
            "mechanic_id",
            "maintenance_date",
            "maintenance_type",
            "cost",
            "notes",
        ]

    def validate_maintenance_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Maintenance date cannot be in the future.")
        return value

    def validate(self, attrs):
        # Existing records keep their mechanic even after that mechanic is
        # deactivated; only newly assigned work requires an active mechanic.
        mechanic = attrs.get("mechanic")
        if mechanic is not None and not mechanic.is_active:
            unchanged = self.instance is not None and self.instance.mechanic_id == mechanic.pk
            if not unchanged:
                raise serializers.ValidationError(
                    {"mechanic_id": "Inactive mechanics cannot be assigned to maintenance."}
                )
        return attrs


class MaintenanceHistorySerializer(serializers.ModelSerializer):
    """A maintenance record as seen from its vehicle (the vehicle is implied)."""

    mechanic = MechanicSerializer(read_only=True)

    class Meta:
        model = models.MaintenanceRecord
        fields = ["id", "maintenance_date", "maintenance_type", "cost", "notes", "mechanic"]


class VehicleDetailSerializer(serializers.ModelSerializer):
    office = OfficeSerializer(read_only=True)
    last_maintenance = serializers.DateField(read_only=True, allow_null=True)
    maintenance_history = MaintenanceHistorySerializer(
        source="maintenance_records", many=True, read_only=True
    )

    class Meta:
        model = models.Vehicle
        fields = [
            "id",
            "vin",
            "license_plate",
            "make",
            "model",
            "year",
            "is_active",
            "office",
            "last_maintenance",
            "maintenance_history",
        ]


class AssignVehicleSerializer(serializers.Serializer):
    office_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Office.objects.all(), source="office"
    )

    def validate_office_id(self, office):
        vehicle = self.context["vehicle"]
        if vehicle.office_id == office.pk:
            raise serializers.ValidationError("Vehicle is already assigned to this office.")
        return office


class DuplicateCheckSerializer(serializers.Serializer):
    vin = UpperCaseCharField(required=False)
    license_plate = UpperCaseCharField(required=False)
    # Lets an edit form check for conflicts without matching the vehicle itself.
    exclude_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        if "vin" not in attrs and "license_plate" not in attrs:
            raise serializers.ValidationError("Provide vin, license_plate or both.")
        return attrs
