"""
Django settings for server project.

Every value that differs between environments is read from an environment
variable. The defaults are for local development, so the project runs with no
configuration, but it refuses to start outside of development without its own
secret key. See .env.example for the list of variables.

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

import os
import sys
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Variables already set in the environment win over the ones in the file.
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


# Security

DEVELOPMENT_SECRET_KEY = 'django-insecure--i^5bam1xi!k^$hyanp@-1kgey0aciz8=i55n@-pn5^!9jl8_c'

DEBUG = env_bool('DJANGO_DEBUG', True)

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', DEVELOPMENT_SECRET_KEY)

# The development key is public, and it signs the login tokens.
if not DEBUG and SECRET_KEY == DEVELOPMENT_SECRET_KEY:
    raise ImproperlyConfigured('Set DJANGO_SECRET_KEY when DJANGO_DEBUG is off.')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', ['localhost', '127.0.0.1'])

# The browser only lets these sites call the API.
CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    ['http://localhost:3000', 'http://127.0.0.1:3000'],
)

# Outside of development everything goes through HTTPS.
SECURE_SSL_REDIRECT = env_bool('DJANGO_SSL_REDIRECT', not DEBUG)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = 0 if DEBUG else 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'drf_spectacular',
    'accounts',
    'fleet',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Real password hashing is slow on purpose. Tests create many users and do not
# need that protection.
if 'test' in sys.argv:
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# API

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Tokens for the frontend and other clients.
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # The session of the admin site, so the browsable API works after login.
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'accounts.permissions.IsManagerOrReadOnly',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.environ.get('THROTTLE_ANON', '60/min'),
        'user': os.environ.get('THROTTLE_USER', '1000/min'),
        # Slows down password guessing.
        'login': os.environ.get('THROTTLE_LOGIN', '10/min'),
    },
    'DEFAULT_PAGINATION_CLASS': 'fleet.pagination.StandardPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    # The challenge examples show costs as JSON numbers (81250.50), not strings.
    'COERCE_DECIMAL_TO_STRING': False,
    'EXCEPTION_HANDLER': 'fleet.exceptions.api_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    # Short, because an access token cannot be cancelled once it is issued.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    # Long, so the user stays logged in. It is cancelled on logout.
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'UPDATE_LAST_LOGIN': True,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Fleet Maintenance API',
    'DESCRIPTION': 'Vehicles, offices, mechanics and maintenance history of a fleet.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}


# Logging

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '{asctime} {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        # To the console: the platform that runs the process collects it.
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
    },
}
