from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Max, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import models, serializers
from .filters import MaintenanceRecordFilterSet, VehicleFilterSet

MAINTENANCE_INTERVAL = timedelta(days=365)


def money_sum(expression, **extra):
    """SUM() that returns 0 instead of NULL when there is nothing to add up."""
    return Coalesce(
        Sum(expression, **extra),
        Value(Decimal("0")),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )


class OfficeViewSet(viewsets.ModelViewSet):
    queryset = models.Office.objects.all()
    serializer_class = serializers.OfficeSerializer
    filterset_fields = ["city"]
    ordering_fields = ["name", "city"]

    @action(detail=False, pagination_class=None, filter_backends=[])
    def summary(self, request):
        since = timezone.localdate() - MAINTENANCE_INTERVAL
        records = "vehicles__maintenance_records"

        # One query. Offices join to vehicles and vehicles to records, so every
        # record appears on exactly one row and SUM/MAX are not inflated; only
        # the vehicle count needs DISTINCT because a vehicle repeats per record.
        offices = models.Office.objects.annotate(
            active_vehicle_count=Count(
                "vehicles", filter=Q(vehicles__is_active=True), distinct=True
            ),
            maintenance_cost_last_year=money_sum(
                f"{records}__cost",
                filter=Q(**{f"{records}__maintenance_date__gte": since}),
            ),
            last_maintenance=Max(f"{records}__maintenance_date"),
        )
        serializer = serializers.OfficeSummarySerializer(offices, many=True)
        return Response(serializer.data)


class VehicleViewSet(viewsets.ModelViewSet):
    filterset_class = VehicleFilterSet
    ordering_fields = ["id", "vin", "make", "model", "year", "last_maintenance"]

    def get_queryset(self):
        queryset = models.Vehicle.objects.select_related("office").with_last_maintenance()
        if self.action == "retrieve":
            # Two queries regardless of how long the history is: one for the
            # vehicle + office, one for every record + its mechanic.
            history = models.MaintenanceRecord.objects.select_related("mechanic").order_by(
                "-maintenance_date", "-id"
            )
            queryset = queryset.prefetch_related(Prefetch("maintenance_records", queryset=history))
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return serializers.VehicleDetailSerializer
        if self.action == "assign":
            return serializers.AssignVehicleSerializer
        if self.action == "maintenance_history":
            return serializers.MaintenanceHistorySerializer
        return serializers.VehicleSerializer

    @action(detail=True, url_path="maintenance-history")
    def maintenance_history(self, request, pk=None):
        vehicle = self.get_object()
        records = vehicle.maintenance_records.select_related("mechanic").order_by(
            "-maintenance_date", "-id"
        )
        page = self.paginate_queryset(records)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        vehicle = self.get_object()
        serializer = self.get_serializer(data=request.data, context={"vehicle": vehicle})
        serializer.is_valid(raise_exception=True)

        vehicle.office = serializer.validated_data["office"]
        # Only the assignment changes; no other column is rewritten.
        vehicle.save(update_fields=["office"])
        return Response(serializers.VehicleSerializer(vehicle).data)

    @action(detail=False, url_path="needing-maintenance")
    def needing_maintenance(self, request):
        cutoff = timezone.localdate() - MAINTENANCE_INTERVAL
        vehicles = (
            self.filter_queryset(self.get_queryset())
            .filter(is_active=True)
            .filter(Q(last_maintenance__isnull=True) | Q(last_maintenance__lt=cutoff))
            # Never-serviced vehicles are the most overdue, so they come first.
            .order_by(F("last_maintenance").asc(nulls_first=True), "id")
        )
        page = self.paginate_queryset(vehicles)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, url_path="duplicate-check", pagination_class=None, filter_backends=[])
    def duplicate_check(self, request):
        params = serializers.DuplicateCheckSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        data = params.validated_data

        others = models.Vehicle.objects.all()
        if "exclude_id" in data:
            others = others.exclude(pk=data["exclude_id"])

        conflicts = []
        if "vin" in data and others.filter(vin=data["vin"]).exists():
            conflicts.append("vin")
        # Plates only have to be unique among active vehicles.
        if (
            "license_plate" in data
            and others.filter(license_plate=data["license_plate"], is_active=True).exists()
        ):
            conflicts.append("license_plate")

        return Response({"conflicts": conflicts})


class MechanicViewSet(viewsets.ModelViewSet):
    queryset = models.Mechanic.objects.all()
    serializer_class = serializers.MechanicSerializer
    filterset_fields = ["is_active"]
    ordering_fields = ["name", "certification_number"]

    @action(detail=False, filter_backends=[])
    def workload(self, request):
        this_year = Q(maintenance_records__maintenance_date__year=timezone.localdate().year)

        mechanics = models.Mechanic.objects.annotate(
            maintenance_count=Count("maintenance_records", filter=this_year),
            total_cost=money_sum("maintenance_records__cost", filter=this_year),
        ).order_by("-maintenance_count", "-total_cost", "name", "id")

        page = self.paginate_queryset(mechanics)
        serializer = serializers.MechanicWorkloadSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = models.MaintenanceRecord.objects.select_related("vehicle", "mechanic")
    serializer_class = serializers.MaintenanceRecordSerializer
    filterset_class = MaintenanceRecordFilterSet
    ordering_fields = ["maintenance_date", "cost"]
