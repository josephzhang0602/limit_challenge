from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .factories import days_ago, make_mechanic, make_record, make_vehicle

RECORDS_URL = "/api/maintenance-records/"


class MaintenanceRecordTests(APITestCase):
    def setUp(self):
        self.vehicle = make_vehicle()
        self.mechanic = make_mechanic()
        self.payload = {
            "vehicle_id": self.vehicle.pk,
            "mechanic_id": self.mechanic.pk,
            "maintenance_date": days_ago(1).isoformat(),
            "maintenance_type": "oil_change",
            "cost": "89.90",
            "notes": "Synthetic oil",
        }

    def post(self, **changes):
        return self.client.post(RECORDS_URL, {**self.payload, **changes}, format="json")

    def test_create_returns_vehicle_and_mechanic_details(self):
        response = self.post()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["vehicle"]["vin"], self.vehicle.vin)
        self.assertEqual(response.data["mechanic"]["name"], self.mechanic.name)
        self.assertEqual(response.data["cost"], Decimal("89.90"))

    def test_notes_are_optional(self):
        payload = {key: value for key, value in self.payload.items() if key != "notes"}

        response = self.client.post(RECORDS_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["notes"], "")

    def test_date_cannot_be_in_the_future(self):
        tomorrow = timezone.localdate() + timedelta(days=1)

        response = self.post(maintenance_date=tomorrow.isoformat())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maintenance_date", response.data)

    def test_cost_cannot_be_negative(self):
        response = self.post(cost="-1.00")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cost", response.data)

    def test_type_must_be_a_known_choice(self):
        response = self.post(maintenance_type="car_wash")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maintenance_type", response.data)

    def test_vehicle_and_mechanic_must_exist(self):
        response = self.post(vehicle_id=999999, mechanic_id=999999)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"vehicle_id", "mechanic_id"})

    def test_inactive_mechanic_cannot_take_new_work(self):
        retired = make_mechanic(is_active=False)

        response = self.post(mechanic_id=retired.pk)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mechanic_id", response.data)

    def test_record_of_a_mechanic_who_left_can_still_be_edited(self):
        record = make_record(self.vehicle, self.mechanic)
        self.mechanic.is_active = False
        self.mechanic.save()

        response = self.client.put(
            f"{RECORDS_URL}{record.pk}/", {**self.payload, "cost": "120.00"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cost"], Decimal("120.00"))

    def test_delete(self):
        record = make_record(self.vehicle, self.mechanic)

        response = self.client.delete(f"{RECORDS_URL}{record.pk}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_list_filters_and_query_count(self):
        mine = make_record(self.vehicle, self.mechanic, maintenance_date=days_ago(3))
        make_record(self.vehicle, self.mechanic, maintenance_date=days_ago(300))
        make_record(make_vehicle(), self.mechanic, maintenance_date=days_ago(3))

        # One COUNT for pagination and one SELECT joining vehicle and mechanic.
        with self.assertNumQueries(2):
            response = self.client.get(
                RECORDS_URL, {"vehicle": self.vehicle.pk, "date_from": days_ago(30).isoformat()}
            )

        self.assertEqual([item["id"] for item in response.data["results"]], [mine.pk])
