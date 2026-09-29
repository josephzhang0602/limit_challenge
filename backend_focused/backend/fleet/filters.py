from django.db.models import Exists, OuterRef
from django_filters import rest_framework as filters
from rest_framework.exceptions import ValidationError

from . import models


class VehicleFilterSet(filters.FilterSet):
    """Vehicle search: every filter is optional and they combine with AND."""

    office = filters.NumberFilter(field_name="office_id")
    is_active = filters.BooleanFilter()
    make = filters.CharFilter(lookup_expr="icontains")
    model = filters.CharFilter(lookup_expr="icontains")
    maintained_from = filters.DateFilter(method="skip")
    maintained_to = filters.DateFilter(method="skip")
    mechanic_certification = filters.CharFilter(method="skip")

    class Meta:
        model = models.Vehicle
        fields = [
            "office",
            "is_active",
            "make",
            "model",
            "maintained_from",
            "maintained_to",
            "mechanic_certification",
        ]

    def skip(self, queryset, name, value):
        # The maintenance filters are applied together in filter_queryset.
        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)

        data = self.form.cleaned_data
        start = data.get("maintained_from")
        end = data.get("maintained_to")
        certification = data.get("mechanic_certification")

        if start and end and start > end:
            raise ValidationError({"maintained_from": ["Must be on or before maintained_to."]})

        # The maintenance filters must all match the *same* record: "serviced by
        # mechanic X between A and B". A single EXISTS guarantees that, and
        # unlike a JOIN it cannot return a vehicle once per matching record.
        conditions = {}
        if start:
            conditions["maintenance_date__gte"] = start
        if end:
            conditions["maintenance_date__lte"] = end
        if certification:
            conditions["mechanic__certification_number__iexact"] = certification

        if conditions:
            matching_records = models.MaintenanceRecord.objects.filter(
                vehicle_id=OuterRef("pk"), **conditions
            )
            queryset = queryset.filter(Exists(matching_records))

        return queryset


class MaintenanceRecordFilterSet(filters.FilterSet):
    vehicle = filters.NumberFilter(field_name="vehicle_id")
    mechanic = filters.NumberFilter(field_name="mechanic_id")
    date_from = filters.DateFilter(field_name="maintenance_date", lookup_expr="gte")
    date_to = filters.DateFilter(field_name="maintenance_date", lookup_expr="lte")

    class Meta:
        model = models.MaintenanceRecord
        fields = ["vehicle", "mechanic", "maintenance_type", "date_from", "date_to"]
