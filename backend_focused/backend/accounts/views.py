from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from .serializers import LoginResultSerializer, LoginSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """Exchange a username and password for an access and a refresh token."""

    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(responses=LoginResultSerializer)
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshView(TokenRefreshView):
    """Exchange a refresh token for a new access token."""


class LogoutView(TokenBlacklistView):
    """Cancel a refresh token, so it cannot create access tokens any more."""


class MeView(APIView):
    """The user that the access token belongs to."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)
