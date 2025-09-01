from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from articles.views import ArticleViewSet

router = routers.DefaultRouter()

router.register(r"articles", ArticleViewSet, basename="article")

urlpatterns = [path("admin/", admin.site.urls), path("api/", include(router.urls))]
