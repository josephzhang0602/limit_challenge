import os
import random
import re
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

from fleet import models

FLEET_CATALOG = {
    "Ford": ["F-150", "F-250", "Transit"],
    "Chevrolet": ["Silverado 1500", "Express 2500"],
    "Ram": ["1500", "ProMaster"],
    "Freightliner": ["Cascadia", "M2 106"],
    "Volvo": ["VNL 760", "VNR 300"],
    "Kenworth": ["T680", "T880"],
    "Peterbilt": ["579", "389"],
    "Mack": ["Anthem", "Granite"],
    "Isuzu": ["NPR", "FTR"],
    "Mercedes-Benz": ["Sprinter"],
}

# (min, max) cost in dollars per maintenance type.
COST_RANGES = {
    "oil_change": (60, 220),
    "tire_service": (120, 1800),
    "brake_service": (250, 1400),
    "inspection": (80, 300),
    "engine_repair": (900, 9500),
    "transmission": (1200, 7800),
    "electrical": (150, 2100),
    "other": (50, 900),
}

OFFICE_SUFFIXES = ["Depot", "Hub", "Service Center", "Terminal"]
HEAVY_HISTORY_SIZE = 350

# username, first name, last name, can change data
DEMO_USERS = [
    ("manager", "Morgan", "Manager", True),
    ("viewer", "Val", "Viewer", False),
]


class Command(BaseCommand):
    help = "Fill the database with dummy fleet data for manual testing"

    def add_arguments(self, parser):
        parser.add_argument("--offices", type=int, default=8)
        parser.add_argument("--mechanics", type=int, default=15)
        parser.add_argument("--vehicles", type=int, default=150)
        parser.add_argument(
            "--seed",
            type=int,
            default=None,
            help="Random seed, to generate the same dataset every time",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Clear existing fleet data before seeding",
        )

    def handle(self, *args, **options):
        # Users first, so they exist even when the fleet data is kept.
        self.create_demo_users()

        if models.Office.objects.exists() or models.Mechanic.objects.exists():
            if not options["force"]:
                self.stdout.write(
                    self.style.WARNING(
                        "Fleet data already exists; rerun with --force to rebuild seed data."
                    )
                )
                return

        self.fake = Faker()
        if options["seed"] is not None:
            Faker.seed(options["seed"])
            random.seed(options["seed"])
        self.today = timezone.localdate()
        self.used_plates = set()

        with transaction.atomic():
            self.clear()
            offices = self.create_offices(options["offices"])
            mechanics = self.create_mechanics(options["mechanics"])
            vehicles = self.create_vehicles(options["vehicles"], offices)
            records = self.create_maintenance_records(vehicles, mechanics)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed data created: {len(offices)} offices, {len(mechanics)} mechanics, "
                f"{len(vehicles)} vehicles, {len(records)} maintenance records."
            )
        )

    def create_demo_users(self):
        """Create one user for each role, to try the application."""
        password = os.environ.get("SEED_USER_PASSWORD", "fleet-demo-2026")
        User = get_user_model()
        for username, first_name, last_name, is_manager in DEMO_USERS:
            user, _ = User.objects.get_or_create(username=username)
            user.first_name = first_name
            user.last_name = last_name
            user.is_staff = is_manager
            user.set_password(password)
            user.save()
        self.stdout.write(
            f"Demo users: manager and viewer, both with the password {password!r}."
        )

    def clear(self):
        # Children first: the foreign keys use PROTECT.
        models.MaintenanceRecord.objects.all().delete()
        models.Vehicle.objects.all().delete()
        models.Mechanic.objects.all().delete()
        models.Office.objects.all().delete()

    def create_offices(self, count):
        offices = []
        for _ in range(count):
            city = self.fake.unique.city()
            offices.append(
                models.Office(name=f"{city} {random.choice(OFFICE_SUFFIXES)}", city=city)
            )
        return models.Office.objects.bulk_create(offices)

    def create_mechanics(self, count):
        mechanics = [
            models.Mechanic(
                name=self.fake.name(),
                certification_number=f"ASE-{self.fake.unique.random_int(100000, 999999)}",
                # Roughly one in six mechanics has left the company.
                is_active=random.random() > 0.17,
            )
            for _ in range(count)
        ]
        # Guarantee at least one active mechanic whatever the random draw was.
        mechanics[0].is_active = True
        return models.Mechanic.objects.bulk_create(mechanics)

    def create_vehicles(self, count, offices):
        vehicles = []
        active_plates = []
        for index in range(count):
            make = random.choice(list(FLEET_CATALOG))
            is_active = index == 0 or random.random() > 0.12

            if is_active:
                plate = self.new_plate()
                active_plates.append(plate)
            elif active_plates and random.random() < 0.3:
                # A retired vehicle whose plate was handed over to an active one.
                plate = random.choice(active_plates)
            else:
                plate = self.new_plate()

            vehicles.append(
                models.Vehicle(
                    vin=self.fake.unique.vin(),
                    license_plate=plate,
                    make=make,
                    model=random.choice(FLEET_CATALOG[make]),
                    year=random.randint(self.today.year - 12, self.today.year),
                    office=random.choice(offices),
                    is_active=is_active,
                )
            )
        return models.Vehicle.objects.bulk_create(vehicles)

    def new_plate(self):
        """Return a plate that no other seeded vehicle uses."""
        while True:
            # Faker uses separators such as a middle dot for some states.
            plate = re.sub(r"[^A-Z0-9]+", "-", self.fake.license_plate().upper()).strip("-")
            if plate not in self.used_plates:
                self.used_plates.add(plate)
                return plate

    def create_maintenance_records(self, vehicles, mechanics):
        records = []
        for index, vehicle in enumerate(vehicles):
            for days_ago in self.maintenance_schedule(index):
                records.append(self.build_record(vehicle, mechanics, days_ago))
        return models.MaintenanceRecord.objects.bulk_create(records, batch_size=500)

    def maintenance_schedule(self, index):
        """Return how many days ago each maintenance of a vehicle happened."""
        if index == 0:
            # One vehicle with a very long history, to exercise the detail endpoint.
            return [random.randint(0, 3000) for _ in range(HEAVY_HISTORY_SIZE)]

        profile = random.random()
        if profile < 0.10:
            return []  # never serviced
        if profile < 0.25:
            # Overdue: every maintenance is more than a year old.
            return [random.randint(380, 1100) for _ in range(random.randint(1, 6))]

        # Regularly serviced: at least one maintenance within the last year.
        recent = [random.randint(0, 360)]
        older = [random.randint(0, 1100) for _ in range(random.randint(2, 11))]
        return recent + older

    def build_record(self, vehicle, mechanics, days_ago):
        maintenance_type = random.choice(models.MaintenanceRecord.MaintenanceType.values)
        low, high = COST_RANGES[maintenance_type]
        cost = Decimal(random.randint(low * 100, high * 100)) / 100
        return models.MaintenanceRecord(
            vehicle=vehicle,
            mechanic=random.choice(mechanics),
            maintenance_date=self.today - timedelta(days=days_ago),
            maintenance_type=maintenance_type,
            cost=cost,
            notes=self.fake.sentence(nb_words=10) if random.random() < 0.6 else "",
        )
