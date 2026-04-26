add ports + ship data, click to view more info

ok a small thing when we hit escape it goes back to the globe view - but we have a layered modal system. so like if we are in the sentinel view the first time we hit escape that should take us to the first layer modal, then if we hit escape again we go to the default globe view

For the current NASA GIBS layers we’re using, we should treat them as one frame per day.

What we can do next:

Daily: best fit for the current app and APIs.
Multiple passes per day: possible in spirit by switching between Terra, Aqua, SNPP, NOAA-20 for the same date, but they are different satellites/sensors, not hourly frames.

when we change the date on the 2nd layer sentinel modal it exits from it when we just want to see the selected date but for the sentinel data

1 day old ship data visualized, when ship is selected it shows full trip path + current ais location

What would adding ais ship data to this app look like? Like ideally we would have ais data loaded, and it would render where each ship was at the estimated time of the imag

ok now I want to think about timing - it looks like the sentinel data comes with timestamps, but it doesn't seem like the other sat imagery does - is this something that we could find or query the api for?

ok now we mentioned this "Use OPERA RTC / ASF-derived Sentinel-1 products
These are more analysis-ready radar backscatter products, especially useful for land. ASF documents OPERA Sentinel-1 RTC as near-global land backscatter from 2023 onward" - how difficult would it be to implement that? would it give us better or even just different visual data than sentinel 1
