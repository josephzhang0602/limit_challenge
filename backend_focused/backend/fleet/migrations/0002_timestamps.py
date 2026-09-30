import django.utils.timezone
from django.db import migrations, models

MODELS = ["office", "vehicle", "mechanic", "maintenancerecord"]


def timestamp_fields(model_name):
    # Rows that already exist get the moment of the migration as both dates.
    # The default is only for them: preserve_default=False removes it afterwards.
    return [
        migrations.AddField(
            model_name=model_name,
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name=model_name,
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]


class Migration(migrations.Migration):
    dependencies = [
        ("fleet", "0001_initial"),
    ]

    operations = [
        operation for model_name in MODELS for operation in timestamp_fields(model_name)
    ]
