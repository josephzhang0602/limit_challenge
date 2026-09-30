from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

LOGIN_URL = "/api/auth/login/"
REFRESH_URL = "/api/auth/refresh/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
VEHICLES_URL = "/api/vehicles/"

PASSWORD = "correct-horse-battery"


class AuthTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        User = get_user_model()
        self.manager = User.objects.create_user(
            "morgan", password=PASSWORD, first_name="Morgan", last_name="Lee", is_staff=True
        )
        self.viewer = User.objects.create_user("val", password=PASSWORD)

    def login(self, username="morgan", password=PASSWORD):
        return self.client.post(
            LOGIN_URL, {"username": username, "password": password}, format="json"
        )

    def use_token(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


class LoginTests(AuthTestCase):
    def test_login_returns_tokens_and_the_user(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data), {"access", "refresh", "user"})
        self.assertEqual(
            response.data["user"],
            {"id": self.manager.pk, "username": "morgan", "name": "Morgan Lee", "role": "manager"},
        )

    def test_user_without_a_name_is_shown_by_username(self):
        response = self.login("val")

        self.assertEqual(response.data["user"]["name"], "val")
        self.assertEqual(response.data["user"]["role"], "viewer")

    def test_wrong_password_is_rejected(self):
        response = self.login(password="wrong")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", response.data)

    def test_unknown_user_gets_the_same_answer_as_a_wrong_password(self):
        # Otherwise the answer would reveal which usernames exist.
        unknown = self.login("nobody")
        wrong = self.login(password="wrong")

        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(unknown.data, wrong.data)

    def test_inactive_user_cannot_log_in(self):
        self.manager.is_active = False
        self.manager.save()

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_fields_are_reported(self):
        response = self.client.post(LOGIN_URL, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"username", "password"})

    def test_login_attempts_are_limited(self):
        # The throttle classes read the rates when they are imported, so the
        # rate is replaced on the class and not in the settings.
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"login": "3/min"}):
            answers = [self.login(password="wrong").status_code for _ in range(4)]

        self.assertEqual(answers, [401, 401, 401, 429])


class TokenTests(AuthTestCase):
    def test_access_token_opens_the_api(self):
        self.use_token(self.login().data["access"])

        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "morgan")

    def test_request_without_a_token_is_rejected(self):
        for url in (ME_URL, VEHICLES_URL, "/api/offices/summary/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token_is_rejected(self):
        self.use_token("not-a-token")

        response = self.client.get(VEHICLES_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_is_not_an_access_token(self):
        self.use_token(self.login().data["refresh"])

        response = self.client.get(VEHICLES_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_gives_a_new_access_token(self):
        refresh = self.login().data["refresh"]

        response = self.client.post(REFRESH_URL, {"refresh": refresh}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.use_token(response.data["access"])
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_200_OK)

    def test_logout_cancels_the_refresh_token(self):
        refresh = self.login().data["refresh"]

        logout = self.client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        again = self.client.post(REFRESH_URL, {"refresh": refresh}, format="json")

        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)


class RoleTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.office = {"name": "HQ", "city": "Austin"}

    def test_viewer_can_read(self):
        self.client.force_authenticate(self.viewer)

        for url in (VEHICLES_URL, "/api/offices/summary/", "/api/mechanics/workload/"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_viewer_cannot_write(self):
        self.client.force_authenticate(self.viewer)

        created = self.client.post("/api/offices/", self.office, format="json")

        self.assertEqual(created.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(created.data["detail"], "Only managers can change data.")

    def test_viewer_cannot_use_the_actions_that_change_data(self):
        self.client.force_authenticate(self.viewer)

        # 403 and not 404: the permission is checked before the vehicle is looked up.
        response = self.client.post("/api/vehicles/1/assign/", {"office_id": 1}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_write(self):
        self.client.force_authenticate(self.manager)

        created = self.client.post("/api/offices/", self.office, format="json")
        deleted = self.client.delete(f"/api/offices/{created.data['id']}/")

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)


class OpenEndpointTests(APITestCase):
    def test_health_needs_no_login(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"status": "ok", "database": "ok"})

    def test_documentation_needs_no_login(self):
        schema = self.client.get("/api/schema/")
        docs = self.client.get("/api/docs/")

        self.assertEqual(schema.status_code, status.HTTP_200_OK)
        self.assertEqual(docs.status_code, status.HTTP_200_OK)
