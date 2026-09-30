from rest_framework.permissions import SAFE_METHODS, BasePermission

MANAGER = "manager"
VIEWER = "viewer"


def role_of(user):
    """Managers change data, viewers only read it.

    The role is the ``is_staff`` flag of the Django user, so no extra table or
    query is needed to know it.
    """
    return MANAGER if user.is_staff else VIEWER


class IsManagerOrReadOnly(BasePermission):
    """Everybody must log in. Reading is for all users, writing for managers."""

    message = "Only managers can change data."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return request.method in SAFE_METHODS or role_of(user) == MANAGER
