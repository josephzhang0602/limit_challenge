"""Small helpers to build test data with sensible defaults."""

from datetime import timedelta
from decimal import Decimal
from itertools import count

from django.utils import timezone

from fleet import models

_sequence = count(1)


def days_ago(days):
    return timezone.localdate() - timedelta(days=days)


def make_office(**overrides):
    number = next(_sequence)
    values = {"name": f"Office {number}", "city": f"City {number}"}
    values.update(overrides)
    return models.Office.objects.create(**values)


def make_mechanic(**overrides):
    number = next(_sequence)
    values = {"name": f"Mechanic {number}", "certification_number": f"ASE-{number:06d}"}
    values.update(overrides)
    return models.Mechanic.objects.create(**values)


def make_vehicle(**overrides):
    number = next(_sequence)
    values = {
        "vin": f"1FTFW1E5{number:09d}",
        "license_plate": f"PLT-{number:04d}",
        "make": "Ford",
        "model": "F-150",
        "year": 2022,
    }
    values.update(overrides)
    if "office" not in values:
        values["office"] = make_office()
    return models.Vehicle.objects.create(**values)


def make_record(vehicle, mechanic=None, **overrides):
    values = {
        "maintenance_date": days_ago(10),
        "maintenance_type": models.MaintenanceRecord.MaintenanceType.OIL_CHANGE,
        "cost": Decimal("100.00"),
    }
    values.update(overrides)
    return models.MaintenanceRecord.objects.create(
        vehicle=vehicle, mechanic=mechanic or make_mechanic(), **values
    )
