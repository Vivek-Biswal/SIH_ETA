# Station geography

`station-geography.json` is copied from the web map's existing generated directory.
Source: `railway_eta_data/data/processed/stations_clean.json`; upstream attribution
and generation details: `apps/web/web_app/scripts/STATION_GEOGRAPHY.md`.
It contains historical station coordinates, not live train positions. Weather
uses provider coordinates first and these coordinates only when absent.

OpenWeather forecasts use `WEATHER_API_KEY` on Render (aliases:
`OPENWEATHER_API_KEY`, `OPENWEATHERMAP_API_KEY`). The HTTPS forecast endpoint is
fixed so keys cannot be sent to an arbitrary configured host. Forecasts are cached
for 15 minutes per location; failures for 60 seconds. Forecast times must be within
three hours of the arrival and the arrival within five days. No weather-to-delay
model has been calibrated; the UI's extra allowance is explicitly user-selected.
