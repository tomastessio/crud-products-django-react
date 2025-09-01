from django.db import models
class Article(models.Model):
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    def __str__(self):
        return f"{self.code} - {self.description}"
