"""Убирает иконку из системной заставки Android: остаётся однотонный фон.
Дальше сразу идёт анимация входа из самого сайта. Запуск: python3 patch-native-splash.py path/to/styles.xml"""
import re
import sys

BG = '#10070e'  # тот же цвет, что backgroundColor в capacitor.config.json

path = sys.argv[1]
s = open(path, encoding='utf-8').read()
m = re.search(r'(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)(.*?)(</style>)', s, re.S)
if not m:
    print('::warning::Стиль AppTheme.NoActionBarLaunch не найден, системная заставка не изменена')
    sys.exit(0)

body = re.sub(
    r'\s*<item name="(android:background|windowSplashScreenBackground|windowSplashScreenAnimatedIcon)">.*?</item>',
    '', m.group(2))
body += (
    '\n        <item name="android:background">%s</item>'
    '\n        <item name="windowSplashScreenBackground">%s</item>'
    '\n        <item name="windowSplashScreenAnimatedIcon">@android:color/transparent</item>\n    ' % (BG, BG))
s = s[:m.start()] + m.group(1) + body + m.group(3) + s[m.end():]
open(path, 'w', encoding='utf-8').write(s)
print(s)
