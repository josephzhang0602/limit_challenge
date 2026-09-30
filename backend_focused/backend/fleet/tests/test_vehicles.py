from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import status

from fleet import models

from .base import ApiTestCase
from .factories import days_ago, make_mechanic, make_office, make_record, make_vehicle

VEHICLES_URL = "/api/vehicles/"


def vehicle_url(vehicle, suffix=""):
    return f"{VEHICLES_URL}{vehicle.pk}/{suffix}"


def result_ids(response):
    return [item["id"] for item in response.data["results"]]


class VehicleCrudTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.office = make_office()
        self.payload = {
            "vin": "1hgcm82633a004352",
            "license_plate": " abc-123 ",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office_id": self.office.pk,
        }

    def test_create_normalises_vin_and_plate(self):
        response = self.client.post(VEHICLES_URL, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["vin"], "1HGCM82633A004352")
        self.assertEqual(response.data["license_plate"], "ABC-123")
        self.assertEqual(response.data["office"]["id"], self.office.pk)
        self.assertTrue(response.data["is_active"])
        self.assertIsNone(response.data["last_maintenance"])

    def test_vin_must_be_unique_regardless_of_case(self):
        make_vehicle(vin="1HGCM82633A004352")

        response = self.client.post(VEHICLES_URL, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["vin"], ["A vehicle with this VIN already exists."])

    def test_invalid_fields_are_reported_together(self):
        payload = {**self.payload, "vin": "TOO-SHORT", "year": 3000, "office_id": 999}

        response = self.client.post(VEHICLES_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"vin", "year", "office_id"})

    def test_update_and_partial_update(self):
        vehicle = make_vehicle(office=self.office)

        response = self.client.patch(vehicle_url(vehicle), {"make": "Volvo"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.make, "Volvo")

    def test_delete_vehicle_without_history(self):
        vehicle = make_vehicle()

        response = self.client.delete(vehicle_url(vehicle))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(models.Vehicle.objects.filter(pk=vehicle.pk).exists())

    def test_delete_vehicle_with_history_is_a_conflict(self):
        vehicle = make_vehicle()
        make_record(vehicle)

        response = self.client.delete(vehicle_url(vehicle))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(models.Vehicle.objects.filter(pk=vehicle.pk).exists())


class LicensePlateRuleTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.office = make_office()
        self.payload = {
            "vin": "1HGCM82633A004352",
            "license_plate": "ABC-123",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office_id": self.office.pk,
        }

    def test_two_active_vehicles_cannot_share_a_plate(self):
        make_vehicle(license_plate="ABC-123")

        response = self.client.post(VEHICLES_URL, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_plate", response.data)

    def test_plate_of_an_inactive_vehicle_can_be_reused(self):
        make_vehicle(license_plate="ABC-123", is_active=False)

        response = self.client.post(VEHICLES_URL, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_inactive_vehicle_can_share_the_plate_of_an_active_one(self):
        make_vehicle(license_plate="ABC-123")

        payload = {**self.payload, "is_active": False}
        response = self.client.post(VEHICLES_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_reactivating_a_vehicle_checks_its_plate(self):
        make_vehicle(license_plate="ABC-123")
        retired = make_vehicle(license_plate="ABC-123", is_active=False)

        response = self.client.patch(vehicle_url(retired), {"is_active": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_plate", response.data)

    def test_vehicle_does_not_conflict_with_itself(self):
        vehicle = make_vehicle(license_plate="ABC-123")

        response = self.client.patch(vehicle_url(vehicle), {"year": 2021}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_database_enforces_the_rule_too(self):
        make_vehicle(license_plate="ABC-123")

        with self.assertRaises(IntegrityError), transaction.atomic():
            make_vehicle(license_plate="ABC-123")


class VehicleSearchTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.north = make_office(name="North")
        cls.south = make_office(name="South")
        cls.alice = make_mechanic(certification_number="ASE-ALICE")
        cls.bob = make_mechanic(certification_number="ASE-BOB")

        cls.ford = make_vehicle(office=cls.north, make="Ford", model="Transit")
        cls.volvo = make_vehicle(office=cls.south, make="Volvo", model="VNL 760")
        cls.retired = make_vehicle(office=cls.north, make="Ford", model="F-150", is_active=False)

        # Ford: Alice recently, Bob a long time ago.
        make_record(cls.ford, cls.alice, maintenance_date=days_ago(20))
        make_record(cls.ford, cls.alice, maintenance_date=days_ago(30))
        make_record(cls.ford, cls.bob, maintenance_date=days_ago(500))
        # Volvo: Bob recently.
        make_record(cls.volvo, cls.bob, maintenance_date=days_ago(25))

    def search(self, **params):
        response = self.client.get(VEHICLES_URL, params)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return result_ids(response)

    def test_no_filters_returns_everything(self):
        self.assertCountEqual(self.search(), [self.ford.pk, self.volvo.pk, self.retired.pk])

    def test_filter_by_office(self):
        self.assertCountEqual(self.search(office=self.north.pk), [self.ford.pk, self.retired.pk])

    def test_filter_by_active_flag(self):
        self.assertCountEqual(self.search(is_active="true"), [self.ford.pk, self.volvo.pk])
        self.assertEqual(self.search(is_active="false"), [self.retired.pk])

    def test_filter_by_make_and_model_ignores_case(self):
        self.assertCountEqual(self.search(make="ford"), [self.ford.pk, self.retired.pk])
        self.assertEqual(self.search(model="transit"), [self.ford.pk])

    def test_filter_by_maintenance_date_range(self):
        found = self.search(maintained_from=days_ago(40).isoformat(), maintained_to=days_ago(22))
        self.assertCountEqual(found, [self.ford.pk, self.volvo.pk])

    def test_filter_by_mechanic_certification(self):
        self.assertEqual(self.search(mechanic_certification="ase-alice"), [self.ford.pk])
        self.assertCountEqual(
            self.search(mechanic_certification="ASE-BOB"), [self.ford.pk, self.volvo.pk]
        )

    def test_vehicle_matching_several_records_is_returned_once(self):
        found = self.search(mechanic_certification="ASE-ALICE", maintained_from=days_ago(60))
        self.assertEqual(found, [self.ford.pk])

    def test_date_range_and_mechanic_must_match_the_same_record(self):
        # Bob serviced the Ford, and the Ford was serviced recently, but Bob did
        # not service the Ford recently.
        found = self.search(mechanic_certification="ASE-BOB", maintained_from=days_ago(60))
        self.assertEqual(found, [self.volvo.pk])

    def test_filters_combine(self):
        found = self.search(office=self.north.pk, is_active="true", make="ford")
        self.assertEqual(found, [self.ford.pk])

    def test_invalid_filter_values_are_rejected(self):
        response = self.client.get(VEHICLES_URL, {"office": "abc", "maintained_from": "soon"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"office", "maintained_from"})

    def test_reversed_date_range_is_rejected(self):
        response = self.client.get(
            VEHICLES_URL, {"maintained_from": days_ago(1), "maintained_to": days_ago(5)}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maintained_from", response.data)

    def test_list_query_count_does_not_depend_on_page_size(self):
        for _ in range(12):
            make_record(make_vehicle(office=self.north), self.alice)

        # One COUNT for pagination and one SELECT for the page.
        with self.assertNumQueries(2):
            response = self.client.get(VEHICLES_URL, {"page_size": 15})

        self.assertEqual(len(response.data["results"]), 15)


class VehicleDetailTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.vehicle = make_vehicle()
        cls.mechanic = make_mechanic(name="Alice")
        cls.old = make_record(cls.vehicle, cls.mechanic, maintenance_date=days_ago(300))
        cls.new = make_record(cls.vehicle, cls.mechanic, maintenance_date=days_ago(3))
        cls.middle = make_record(cls.vehicle, cls.mechanic, maintenance_date=days_ago(90))

    def test_detail_includes_office_history_and_mechanics(self):
        response = self.client.get(vehicle_url(self.vehicle))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["office"]["name"], self.vehicle.office.name)
        self.assertEqual(response.data["last_maintenance"], days_ago(3).isoformat())
        history = response.data["maintenance_history"]
        self.assertEqual([item["id"] for item in history], [self.new.pk, self.middle.pk, self.old.pk])
        self.assertEqual(history[0]["mechanic"]["name"], "Alice")
        self.assertEqual(history[0]["cost"], Decimal("100.00"))

    def test_detail_uses_two_queries_for_a_long_history(self):
        mechanics = [make_mechanic() for _ in range(5)]
        models.MaintenanceRecord.objects.bulk_create(
            models.MaintenanceRecord(
                vehicle=self.vehicle,
                mechanic=mechanics[number % 5],
                maintenance_date=days_ago(number),
                maintenance_type="inspection",
                cost=Decimal("50.00"),
            )
            for number in range(300)
        )

        with self.assertNumQueries(2):
            response = self.client.get(vehicle_url(self.vehicle))

        self.assertEqual(len(response.data["maintenance_history"]), 303)

    def test_unknown_vehicle_returns_404(self):
        response = self.client.get(f"{VEHICLES_URL}999999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_history_is_ordered_newest_first_and_paginated(self):
        make_record(make_vehicle(), self.mechanic)  # another vehicle, must not leak in

        response = self.client.get(
            vehicle_url(self.vehicle, "maintenance-history/"), {"page_size": 2}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(result_ids(response), [self.new.pk, self.middle.pk])
        self.assertEqual(response.data["results"][0]["mechanic"]["name"], "Alice")

    def test_history_of_unknown_vehicle_returns_404(self):
        response = self.client.get(f"{VEHICLES_URL}999999/maintenance-history/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AssignVehicleTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.origin = make_office(name="Origin")
        self.destination = make_office(name="Destination")
        self.vehicle = make_vehicle(office=self.origin, make="Ford")

    def assign(self, payload):
        return self.client.post(vehicle_url(self.vehicle, "assign/"), payload, format="json")

    def test_moves_the_vehicle_to_the_new_office(self):
        response = self.assign({"office_id": self.destination.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["office"]["id"], self.destination.pk)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.office, self.destination)

    def test_only_the_office_is_written(self):
        # A change made elsewhere after the vehicle was loaded must survive.
        models.Vehicle.objects.filter(pk=self.vehicle.pk).update(make="Volvo")

        self.assign({"office_id": self.destination.pk, "make": "Ignored"})

        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.make, "Volvo")

    def test_same_office_is_rejected(self):
        response = self.assign({"office_id": self.origin.pk})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("office_id", response.data)

    def test_unknown_or_missing_office_is_rejected(self):
        self.assertEqual(self.assign({"office_id": 999999}).status_code, 400)
        self.assertEqual(self.assign({}).status_code, 400)

    def test_get_is_not_allowed(self):
        response = self.client.get(vehicle_url(self.vehicle, "assign/"))

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class VehiclesNeedingMaintenanceTests(ApiTestCase):
    URL = f"{VEHICLES_URL}needing-maintenance/"

    @classmethod
    def setUpTestData(cls):
        cls.never = make_vehicle()
        cls.overdue = make_vehicle()
        cls.very_overdue = make_vehicle()
        cls.on_the_limit = make_vehicle()
        cls.recent = make_vehicle()
        cls.retired = make_vehicle(is_active=False)

        make_record(cls.overdue, maintenance_date=days_ago(366))
        make_record(cls.very_overdue, maintenance_date=days_ago(900))
        make_record(cls.on_the_limit, maintenance_date=days_ago(365))
        # An old maintenance does not matter once there is a recent one.
        make_record(cls.recent, maintenance_date=days_ago(800))
        make_record(cls.recent, maintenance_date=days_ago(5))

    def test_returns_never_serviced_and_overdue_vehicles_oldest_first(self):
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            result_ids(response), [self.never.pk, self.very_overdue.pk, self.overdue.pk]
        )
        self.assertIsNone(response.data["results"][0]["last_maintenance"])
        self.assertEqual(response.data["results"][1]["last_maintenance"], days_ago(900).isoformat())

    def test_can_be_narrowed_with_the_search_filters(self):
        response = self.client.get(self.URL, {"office": self.overdue.office_id})

        self.assertEqual(result_ids(response), [self.overdue.pk])


class DuplicateCheckTests(ApiTestCase):
    URL = f"{VEHICLES_URL}duplicate-check/"

    @classmethod
    def setUpTestData(cls):
        cls.active = make_vehicle(vin="1HGCM82633A004352", license_plate="ABC-123")
        cls.retired = make_vehicle(
            vin="2HGCM82633A004352", license_plate="OLD-999", is_active=False
        )

    def conflicts(self, **params):
        response = self.client.get(self.URL, params)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data["conflicts"]

    def test_reports_both_fields(self):
        found = self.conflicts(vin="1HGCM82633A004352", license_plate="ABC-123")
        self.assertEqual(found, ["vin", "license_plate"])

    def test_reports_a_single_field(self):
        self.assertEqual(self.conflicts(vin="1HGCM82633A004352", license_plate="NEW-1"), ["vin"])
        self.assertEqual(
            self.conflicts(vin="3HGCM82633A004352", license_plate="ABC-123"), ["license_plate"]
        )

    def test_reports_nothing_when_there_is_no_conflict(self):
        self.assertEqual(self.conflicts(vin="3HGCM82633A004352", license_plate="NEW-1"), [])

    def test_ignores_case(self):
        found = self.conflicts(vin="1hgcm82633a004352", license_plate="abc-123")
        self.assertEqual(found, ["vin", "license_plate"])

    def test_vin_of_inactive_vehicle_conflicts_but_its_plate_does_not(self):
        found = self.conflicts(vin="2HGCM82633A004352", license_plate="OLD-999")
        self.assertEqual(found, ["vin"])

    def test_vehicle_can_be_excluded_when_editing(self):
        found = self.conflicts(
            vin="1HGCM82633A004352", license_plate="ABC-123", exclude_id=self.active.pk
        )
        self.assertEqual(found, [])

    def test_requires_at_least_one_field(self):
        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
