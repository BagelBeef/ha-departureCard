# Custom Departure Card for Home Assistant
This custom-card is based on the integration [ha-db_infoscreen](https://github.com/FaserF/ha-db_infoscreen/) developed by [FaserF](https://github.com/FaserF). 

<img src="https://raw.githubusercontent.com/BagelBeef/ha-departureCard/refs/heads/main/images/KoelnHbf.jpg" alt="Preview1" width="400px">

<img src="https://raw.githubusercontent.com/BagelBeef/ha-departureCard/refs/heads/main/images/Kippekausen.jpg" alt="Preview2" width="400px">

## HACS Installation (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=BagelBeef&repository=ha-departureCard&category=plugin)

If you use this method your departureCard will always update to the newest version.

## Manual Installation

To install this custom card, follow these steps:
	
 1.	Download the card’s JavaScript file and add it to the /www/ directory in your Home Assistant instance.
	
 2.	Add the path to this card to your dashboard ressources (options -> dashboard -> three dots -> ressources):

resources:
  - url: /local/departureCard.js
    type: javascript-module

	
 3.	Use the example configuration above in your dashboard (manual yaml-configuration).

# Have fun!

## Card Configuration

The following example demonstrates how to configure the card in your dashboard. You can use the graphical editor or the following yaml configuration.

```yaml
type: custom:departure-card
title: Köln Hbf
entity: sensor.koln_hbf_departures
connections_attribute: next_departures
displayed_connections: 8
fontSize: s
unix_time: false
convertTimeHHMM: false
relativeTime: false
limit: 60
targets: null
exclude: false
line: null
lineExclude: false
train: train
platform: platform
show_platform: true
departure: scheduledDeparture
delay: delayDeparture
isCancelled: isCancelled 
stopAttribute: route 
filterByStop: Köln Messe/Deutz
stationName: Köln Hbf
```
## Filter Options
There are multiple ways you can filter and display connections. 

### 1. Filter by target
If you want to see all connections with a specific final destination, you can filter your connections by target. 
This example shows all trains and busses with destination "Düsseldorf Hbf": 
```yaml
targets: Düsseldorf Hbf
```

If you want disable this filter and see all connections just set it to "null" or skip this line. If you want to invert the target filter you have to add:
```yaml
exclude: true
```

### 2. Filter by line
If you want see only specific trains you can enter the train / line number. If you want to filter out specific trains / lines you just have to switch lineExclude to true and the given train number will be excluded.
```yaml
line: RE 1
lineExclude: true
```

### 3. Filter by stop
If you want to show only connections which have a certain stop, you have to make sure this information is provided by the api. Not for all stations those information are given.

You can check your entity with the template tool in the developer section of your home assistant.
```yaml
{{ states.sensor.YOUR_ENTITY.attributes }}
```
Usually there should be an route[] item which contains a list of stops. You can use the stopAttribute if the list of stops are not displayed under route or if the name of the element is different. If it's route you can skip this line. 

Since the list of stops contains all stops of the train, we need to know which stops are allready done and which stops are still to go. Therefor you have to provide the information of your stationName.
```yaml
stationName: Köln Hbf
```
All stops before Köln Hbf will be ignored in the list of stops because those are not in the direction of travel. 

Now you have to provide the name of the stop which you want to filter all remaining connections by. 
```yaml
filterByStop: Köln Messe/Deutz
```
<img src="https://raw.githubusercontent.com/BagelBeef/ha-departureCard/refs/heads/main/images/filterByStop.jpg" alt="Preview3" width="400px">

You can skip those lines to disable this filter. 

## Parameters Explained

### type
Specifies the type of card to display.

### title
The title displayed at the top of the card.

### entity
The entity ID of the sensor that contains the departure data.

### connections_attribute
The attribute within the sensor data that holds the list of departures.

### displayed_connections
The number of connections (departures) to display.

### fontSize
Font size used in the table. Allowed values are xs, s (default), m, l and xl.

### unix_time
Boolean flag that determines whether to convert Unix time format for timestamps. Check your sensor. If it shows something like 1737619740 it's unix-time.  

### convertTimeHHMM
Sometimes the timestamp given by the api appears like this "2025-01-26 20:12:00". Set convertTimeHHMM: true if you want to convert those timestamps into HH:MM.

### relativeTime
If you want to display time values in relative time set realativeTime: true.

### limit
All time values above the limit will be displayed in HH:MM. 

Default is set to 60

## connection_properties

Defines how each departure is displayed and which properties are included.

### targets
Targets for the connection. If no specific target is needed, set it to null.

### train
The attribute from the sensor data that represents the train information.

### platform
The attribute from the sensor data where the train departs from.

### show_platform
Boolean flag to specify whether the platform number should be shown or not.

### departure
The attribute from the sensor data that contains the scheduled departure time of the train.

### delay
The attribute from the sensor that represents the delay of the departure.

### isCancelled
The attribute from the sensor that contains the information if the train is cancelled.


