from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .factories import make_mechanic, make_record, make_vehicle

MECHANICS_URL = "/api/mechanics/"
WORKLOAD_URL = f"{MECHANICS_URL}workload/"


class MechanicCrudTests(APITestCase):
    def test_create_normalises_certification_number(self):
        response = self.client.post(
            MECHANICS_URL, {"name": "Alice", "certification_number": "ase-1"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["certification_number"], "ASE-1")
        self.assertTrue(response.data["is_active"])

    def test_certification_number_must_be_unique(self):
        make_mechanic(certification_number="ASE-1")

        response = self.client.post(
            MECHANICS_URL, {"name": "Bob", "certification_number": "ase-1"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("certification_number", response.data)

    def test_update_and_delete(self):
        mechanic = make_mechanic()
        url = f"{MECHANICS_URL}{mechanic.pk}/"

        updated = self.client.patch(url, {"is_active": False}, format="json")
        self.assertFalse(updated.data["is_active"])

        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

    def test_mechanic_with_records_cannot_be_deleted(self):
        mechanic = make_mechanic()
        make_record(make_vehicle(), mechanic)

        response = self.client.delete(f"{MECHANICS_URL}{mechanic.pk}/")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


class MechanicWorkloadTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Every date is on or before today, whatever day the tests run on.
        this_year = date(timezone.localdate().year, 1, 1)
        last_year = date(this_year.year - 1, 12, 31)
        vehicle = make_vehicle()

        cls.busy = make_mechanic(name="Busy")
        cls.expensive = make_mechanic(name="Expensive")
        cls.cheap = make_mechanic(name="Cheap")
        cls.idle = make_mechanic(name="Idle")

        for _ in range(3):
            make_record(vehicle, cls.busy, maintenance_date=this_year, cost=Decimal("10.00"))
        # Same number of jobs: the higher total cost breaks the tie.
        make_record(vehicle, cls.expensive, maintenance_date=this_year, cost=Decimal("900.00"))
        make_record(vehicle, cls.cheap, maintenance_date=this_year, cost=Decimal("20.50"))
        # Work done last year does not count.
        make_record(vehicle, cls.cheap, maintenance_date=last_year, cost=Decimal("5000.00"))
        make_record(vehicle, cls.idle, maintenance_date=last_year, cost=Decimal("5000.00"))

    def test_orders_mechanics_from_busiest_to_least_busy(self):
        response = self.client.get(WORKLOAD_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [mechanic["name"] for mechanic in response.data["results"]]
        self.assertEqual(names, ["Busy", "Expensive", "Cheap", "Idle"])

    def test_counts_only_the_current_year(self):
        response = self.client.get(WORKLOAD_URL)

        workload = {mechanic["name"]: mechanic for mechanic in response.data["results"]}
        self.assertEqual(workload["Busy"]["maintenance_count"], 3)
        self.assertEqual(workload["Busy"]["total_cost"], Decimal("30.00"))
        self.assertEqual(workload["Cheap"]["maintenance_count"], 1)
        self.assertEqual(workload["Cheap"]["total_cost"], Decimal("20.50"))
        self.assertEqual(workload["Idle"]["maintenance_count"], 0)
        self.assertEqual(workload["Idle"]["total_cost"], Decimal("0.00"))

    def test_query_count(self):
        # One COUNT for pagination and one SELECT for the page.
        with self.assertNumQueries(2):
            self.client.get(WORKLOAD_URL)
