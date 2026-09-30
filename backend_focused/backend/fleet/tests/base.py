from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase


class ApiTestCase(APITestCase):
    """Test case whose requests are made by a manager.

    The permissions have their own tests in the accounts app. Here the user is
    only needed so the endpoints can be reached.
    """

    def setUp(self):
        super().setUp()
        # The rate limits count requests in the cache.
        cache.clear()
        self.user = get_user_model().objects.create_user("manager", is_staff=True)
        self.client.force_authenticate(self.user)
