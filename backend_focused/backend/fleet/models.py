from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import OuterRef, Q, Subquery

# ISO 3779: 17 characters, letters I, O and Q are never used.
vin_validator = RegexValidator(
    regex=r"^[A-HJ-NPR-Z0-9]{17}$",
    message="VIN must be 17 characters long and cannot contain the letters I, O or Q.",
)

plate_validator = RegexValidator(
    regex=r"^[A-Z0-9][A-Z0-9 -]*$",
    message="License plate may only contain letters, digits, spaces and hyphens.",
)


class Office(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return f"{self.name} ({self.city})"


class VehicleQuerySet(models.QuerySet):
    def with_last_maintenance(self):
        """Annotate each vehicle with the date of its most recent maintenance.

        A correlated subquery is used instead of a JOIN + GROUP BY so the
        (vehicle, -maintenance_date) index answers it with a single lookup per
        vehicle, and only for the rows of the page being returned.
        """
        latest = (
            MaintenanceRecord.objects.filter(vehicle_id=OuterRef("pk"))
            .order_by("-maintenance_date")
            .values("maintenance_date")[:1]
        )
        return self.annotate(last_maintenance=Subquery(latest))


class Vehicle(models.Model):
    vin = models.CharField(
        "VIN", max_length=17, unique=True, validators=[vin_validator]
    )
    license_plate = models.CharField(max_length=16, validators=[plate_validator])
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveSmallIntegerField(validators=[MinValueValidator(1900)])
    office = models.ForeignKey(
        Office, on_delete=models.PROTECT, related_name="vehicles"
    )
    is_active = models.BooleanField(default=True)

    objects = VehicleQuerySet.as_manager()

    class Meta:
        ordering = ["id"]
        constraints = [
            # A plate can be reused once the vehicle holding it is deactivated,
            # so uniqueness only applies to active vehicles (partial index).
            models.UniqueConstraint(
                fields=["license_plate"],
                condition=Q(is_active=True),
                name="unique_active_license_plate",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return f"{self.year} {self.make} {self.model} ({self.vin})"


class Mechanic(models.Model):
    name = models.CharField(max_length=255)
    certification_number = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return f"{self.name} ({self.certification_number})"


class MaintenanceRecord(models.Model):
    class MaintenanceType(models.TextChoices):
        OIL_CHANGE = "oil_change", "Oil change"
        TIRE_SERVICE = "tire_service", "Tire service"
        BRAKE_SERVICE = "brake_service", "Brake service"
        INSPECTION = "inspection", "Inspection"
        ENGINE_REPAIR = "engine_repair", "Engine repair"
        TRANSMISSION = "transmission", "Transmission"
        ELECTRICAL = "electrical", "Electrical"
        OTHER = "other", "Other"

    # PROTECT: maintenance records are cost history, so a vehicle or mechanic
    # that has any must be deactivated rather than deleted.
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    mechanic = models.ForeignKey(
        Mechanic, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    maintenance_date = models.DateField()
    maintenance_type = models.CharField(
        max_length=32, choices=MaintenanceType.choices
    )
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-maintenance_date", "-id"]
        indexes = [
            models.Index(
                fields=["vehicle", "-maintenance_date"], name="record_vehicle_date_idx"
            ),
            models.Index(
                fields=["mechanic", "maintenance_date"], name="record_mechanic_date_idx"
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover - simple repr
        return f"{self.vehicle_id} - {self.maintenance_type} - {self.maintenance_date}"
