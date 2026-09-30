from decimal import Decimal

from rest_framework import status

from fleet import models

from .base import ApiTestCase
from .factories import days_ago, make_office, make_record, make_vehicle

OFFICES_URL = "/api/offices/"
SUMMARY_URL = f"{OFFICES_URL}summary/"


class OfficeCrudTests(ApiTestCase):
    def test_create_list_update_delete(self):
        created = self.client.post(OFFICES_URL, {"name": "HQ", "city": "Austin"}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        url = f"{OFFICES_URL}{created.data['id']}/"

        listed = self.client.get(OFFICES_URL)
        self.assertEqual(listed.data["count"], 1)

        updated = self.client.patch(url, {"city": "Dallas"}, format="json")
        self.assertEqual(updated.data["city"], "Dallas")

        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(models.Office.objects.exists())

    def test_required_fields(self):
        response = self.client.post(OFFICES_URL, {"name": ""}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"name", "city"})

    def test_office_with_vehicles_cannot_be_deleted(self):
        vehicle = make_vehicle()

        response = self.client.delete(f"{OFFICES_URL}{vehicle.office_id}/")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("detail", response.data)


class OfficeSummaryTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.busy = make_office(name="Busy", city="Austin")
        cls.empty = make_office(name="Empty", city="Boise")

        first = make_vehicle(office=cls.busy)
        second = make_vehicle(office=cls.busy)
        retired = make_vehicle(office=cls.busy, is_active=False)

        make_record(first, maintenance_date=days_ago(10), cost=Decimal("100.10"))
        make_record(first, maintenance_date=days_ago(200), cost=Decimal("200.20"))
        make_record(first, maintenance_date=days_ago(365), cost=Decimal("50.00"))
        make_record(first, maintenance_date=days_ago(366), cost=Decimal("9999.00"))
        make_record(second, maintenance_date=days_ago(40), cost=Decimal("300.00"))
        # Retired vehicles are not counted, but what they cost still is.
        make_record(retired, maintenance_date=days_ago(5), cost=Decimal("25.00"))

        # Another office, to prove that offices do not leak into each other.
        other = make_vehicle(office=make_office(name="Other", city="Chicago"))
        make_record(other, maintenance_date=days_ago(1), cost=Decimal("1.00"))

    def summary(self):
        response = self.client.get(SUMMARY_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {office["name"]: office for office in response.data}

    def test_returns_every_office_as_a_plain_list(self):
        response = self.client.get(SUMMARY_URL)

        self.assertIsInstance(response.data, list)
        self.assertEqual([office["name"] for office in response.data], ["Busy", "Empty", "Other"])

    def test_counts_active_vehicles_once_each(self):
        # The vehicles have several records each; they must not be counted twice.
        self.assertEqual(self.summary()["Busy"]["active_vehicle_count"], 2)

    def test_sums_the_cost_of_the_last_twelve_months(self):
        self.assertEqual(
            self.summary()["Busy"]["maintenance_cost_last_year"], Decimal("675.30")
        )

    def test_reports_the_most_recent_maintenance(self):
        self.assertEqual(self.summary()["Busy"]["last_maintenance"], days_ago(5).isoformat())

    def test_office_without_vehicles(self):
        self.assertEqual(
            self.summary()["Empty"],
            {
                "id": self.empty.pk,
                "name": "Empty",
                "city": "Boise",
                "active_vehicle_count": 0,
                "maintenance_cost_last_year": Decimal("0.00"),
                "last_maintenance": None,
            },
        )

    def test_cost_is_rendered_as_a_json_number(self):
        response = self.client.get(SUMMARY_URL)

        self.assertIn(b'"maintenance_cost_last_year":675.3', response.content)

    def test_uses_a_single_query(self):
        with self.assertNumQueries(1):
            self.client.get(SUMMARY_URL)
