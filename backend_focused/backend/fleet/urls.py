from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("offices", views.OfficeViewSet, basename="office")
router.register("vehicles", views.VehicleViewSet, basename="vehicle")
router.register("mechanics", views.MechanicViewSet, basename="mechanic")
router.register(
    "maintenance-records", views.MaintenanceRecordViewSet, basename="maintenance-record"
)

urlpatterns = router.urls
