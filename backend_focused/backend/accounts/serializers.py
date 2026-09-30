from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .permissions import role_of


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "name", "role"]

    def get_name(self, user) -> str:
        return user.get_full_name() or user.username

    def get_role(self, user) -> str:
        return role_of(user)


class LoginResultSerializer(serializers.Serializer):
    """The answer of a login. Only used to document the API."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class LoginSerializer(TokenObtainPairSerializer):
    """Return the user next to the tokens, so the client needs one request."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
