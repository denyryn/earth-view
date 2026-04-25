add ports + ship data, click to view more info

ok a small thing when we hit escape it goes back to the globe view - but we have a layered modal system. so like if we are in the sentinel view the first time we hit escape that should take us to the first layer modal, then if we hit escape again we go to the default globe view

For the current NASA GIBS layers we’re using, we should treat them as one frame per day.

What we can do next:

Daily: best fit for the current app and APIs.
Multiple passes per day: possible in spirit by switching between Terra, Aqua, SNPP, NOAA-20 for the same date, but they are different satellites/sensors, not hourly frames.

when we change the date on the 2nd layer sentinel modal it exits from it when we just want to see the selected date but for the sentinel data
