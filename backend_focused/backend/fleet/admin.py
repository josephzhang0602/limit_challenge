from django.contrib import admin

from . import models


@admin.register(models.Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ("name", "city")
    search_fields = ("name", "city")


@admin.register(models.Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("vin", "license_plate", "make", "model", "year", "office", "is_active")
    list_filter = ("is_active", "office", "make")
    search_fields = ("vin", "license_plate")


@admin.register(models.Mechanic)
class MechanicAdmin(admin.ModelAdmin):
    list_display = ("name", "certification_number", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "certification_number")


@admin.register(models.MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "mechanic", "maintenance_date", "maintenance_type", "cost")
    list_filter = ("maintenance_type",)
    raw_id_fields = ("vehicle", "mechanic")
