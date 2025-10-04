// developed by BagelBeef
class DepartureCard extends HTMLElement {
  constructor() {
    super();
    this.prevState = null;  // saves the previous state of the departure entity
    this.prevHass = null; // saves the previous Hass
  }
  validateConfig(config, hass) {
    const errors = [];
    
    if (!config.entity) errors.push("No entity configured.");
    else if (!hass.states?.[config.entity]) errors.push(`Entity '${config.entity}' not found in Home Assistant.`);
    
    if (!config.departure) errors.push("Missing 'departure' attribute in config.");
    if (!config.train) errors.push("Missing 'train' attribute in config.");
    if (!config.delay) errors.push("Missing 'delay' attribute in config.");
    if (!config.connections_attribute) errors.push("Missing connection attribute.");
    
    return errors;
  }
  // Sets the 'hass' state, which holds the Home Assistant data
  set hass(hass) {
    const config = this.config;
    const errors = this.validateConfig(config, hass);
    if (errors.length > 0) {
    this.innerHTML = `<ha-card>
        <div class="card-content">
            <h1>${config.title || "Departure Card"}</h1>
            <p>${errors.join("<br>")}</p>
        </div>
    </ha-card>`;
    return;
    }
    const entity = config.entity;
    const currentState = hass.states[entity].state;

    // Check if entity and attributes has changed
    if (this.prevHass && this.prevHass.states[entity] === hass.states[entity]) {
      return;
    }

    // Check if the state of entity has changed
    if (this.prevState === currentState) {
      return;
    }

    this.prevState = currentState; // save current state
    this.prevHass = hass; // save current hass

    const connectionsAttribute = config.connections_attribute || 'next_departures';
    const displayed_connections = config.displayed_connections || 5;
    const unixTime = config.unix_time || false;
    const convertTimeHHMM = config.convertTimeHHMM || false;
    const relativeTime = config.relativeTime || false;
    const limit = config.limit || 60;

    // Targets (destinations) that should be filtered from the connections list
    const targets = config.targets || [];
    const connections = hass.states[entity].attributes[connectionsAttribute];
    const exclude = config.exclude || false;
    const line = config.line ? (Array.isArray(config.line) ? config.line.map(String) : [String(config.line)]) : [];
    const lineExclude = config.lineExclude || false;
    
    // Get stopAttribute and stop for filtering
    const stopAttribute = config.stopAttribute || 'route'; //where to found route list
    const stop = config.filterByStop || null; // filterByStop stop can be null
    const stationName = config.stationName || null; // stationName to slice route up to statioName

    // If no connections are available, display a message saying no departures are available
    if (!connections || connections.length === 0) {
      this.innerHTML = `<ha-card>
                          <div class="card-content">
                            <h1>${config.title}</h1>
                            <p>No departures available.</p>
                          </div>
                        </ha-card>`;
      return;
    }

    // If there are specified target destinations, filter the connections accordingly
    let filtered_connections = connections;
    if (targets.length > 0) {
      if (exclude) {
        filtered_connections = connections.filter(connection =>
          !targets.includes(connection.destination)
        );
      } else {
        filtered_connections = connections.filter(connection =>
          targets.includes(connection.destination)
        );
      }
    }
    if (line.length > 0) {
      if (lineExclude) {
        filtered_connections = filtered_connections.filter(connection => 
          !line.includes(String(connection[config.train]))
        );
      } else {
        filtered_connections = filtered_connections.filter(connection => 
          line.includes(String(connection[config.train]))
        );
      }
    }
    
    // Filter by the specified stop in the route, but only if stop and stopAttribute are valid
    if (stop && stopAttribute) {
      filtered_connections = filtered_connections.filter(connection => {
        const route = connection[stopAttribute];
        if (route && Array.isArray(route)) {
          // Find the index of stationName in the route
          const stationIndex = route.findIndex(routeStop => routeStop.name === stationName);
          if (stationIndex === -1) {
            return false; // stationName is not in the route, so skip this connection
          }

          // Extract stops after stationName
          const stopsAfterStation = route.slice(stationIndex);
          connection[stopAttribute] = stopsAfterStation; // Update the route list to include only stops after stationName

          // Check if the stop exists in the stops after stationName
          return stopsAfterStation.some(routeStop => routeStop.name === stop);
        }
        return false; // No valid route or no valid stops in the route
      });
    }
    
    // If no connections match the specified targets, show a message saying no departures were found
    if (filtered_connections.length === 0) {
      this.innerHTML = `<ha-card>
                          <div class="card-content">
                            <h1>${config.title}</h1>
                            <p>No departures found for the specified destinations or stops. Check statioName if you want to use filter by stop!</p>
                          </div>
                        </ha-card>`;
      return;
    }

    // Build HTML content to display the departure information
    let departuresHtml = `
      <ha-card>
        <style>
          .card-content {
            max-width: 100%;
            padding: 16px;
            overflow-x: auto;
	  }
	  .card-content.text-xs { font-size: var(--ha-font-size-xs); }
	  .card-content.text-s { font-size: var(--ha-font-size-s); }
	  .card-content.text-m { font-size: var(--ha-font-size-m); }
	  .card-content.text-l { font-size: var(--ha-font-size-l); }
	  .card-content.text-xl { font-size: var(--ha-font-size-xl); }
          h1 {
            margin: 8px 0 0 0;
          }
          .filtered-stop {
            color: var(--secondary-text-color);
            margin-top: 0;
          }
          .table {
	    margin: 0 -16px 0 -16px;
            width: calc(100% + 32px);
            border-collapse: collapse;
          }
          .departure-row td {
            border-bottom: var(--ha-card-border-width,1px) solid var(--ha-card-border-color,var(--divider-color,#e0e0e0));
            line-height: 1.2;
	    padding: 4px;
          }
	  .departure-row:last-child td {
	    border-bottom: 0px none;
	  }
	  .departure-row td:last-child {
	    padding-right: 16px;
	  }
	  .on-time .departure {
	    color: var(--success-color);
	  }
	  .delayed .departure {
	    color: var(--error-color);
	  }
          .cancelled {
            text-decoration: line-through;
            opacity: 0.6;
          }
          .departure-row td.train {
            text-align: left;
            white-space: nowrap;
	    padding-left: 16px;
          }
          .departure-row td.destination {
            text-align: left;
            max-width: 150px;
          }
          .destination-text {
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .departure-row td.platform {
            text-align: left;            
            white-space: nowrap;
          }
          .departure-row td.departure {
            text-align: right;
            white-space: nowrap;
          }
          .departure-row td.delay {
            text-align: left;
            padding-left: 4px;
            min-width: 20px;
            white-space: nowrap;
          }
          .delay span {
            color: red;
          }
        </style>
        <div class="card-content text-${config.fontSize}">
          <h1>${config.title}</h1>
    `;
    
    // Display the filtered stop information, if any
    if (stop) {
      departuresHtml += `<p class="filtered-stop">Filtered by stop: ${stop}</p>`; // Show filtered stop
    }
    
    //Start table
    departuresHtml += '<table class="table"><tbody>';
    
    // Loop through the filtered connections and display them
    filtered_connections.slice(0, displayed_connections).forEach(connection => {
      const train = connection[config.train]; 
      const destination = connection.destination;
      const delay = connection[config.delay] || 0;
      const platform = connection[config.platform] || 'N/A';  // Default to 'N/A' if no platform info
      const isCancelled = connection[config.isCancelled || 'isCancelled'] || 0;
      // Check if a conversion of unix-time is necessary
      let departure;
      if (unixTime && !relativeTime) {
        departure = new Date(connection[config.departure] * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      } else if (convertTimeHHMM) {
        departure = new Date(connection[config.departure].replace(' ', 'T')).toTimeString().slice(0, 5);
      } else {
        departure = connection[config.departure] || '';
      }

      // Default color for departure time and text for no delay.mIf there is a delay, adjust color and add delay text
      let departureState = delay > 0 ? "delayed" : "on-time";
      let delayText = delay > 0 ? `+${delay}` : "";
      departureState = isCancelled == 1 ? "cancelled" : departureState;

      if (relativeTime && !unixTime) {
        let [h, m] = departure.split(':').map(Number),
          now = new Date(),
          d = new Date(now);
        d.setHours(h, m + delay, 0, 0);
        if (d < now && d-now > 5) d.setDate(d.getDate() + 1); // Mitternacht-Übergang

        let diffMinutes = Math.round((d - now) / 60000);
        if (diffMinutes < limit) {
          departure = diffMinutes <= 0 ? "Jetzt" : `In ${diffMinutes} Minuten`;
          delayText = "";
        } 
        
      }
      if (relativeTime && unixTime) {
        let d = new Date(connection[config.departure] * 1000);
        d.setMinutes(d.getMinutes() + Number(delay));
        
        let diffMinutes = Math.round((d - new Date()) / 60000);
        
        if (diffMinutes < limit) {
          departure = diffMinutes <= 0 ? "Jetzt" : `In ${diffMinutes} Minuten`;
          delayText = "";
        } else {
          departure = new Date(connection[config.departure] * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
      }

      departuresHtml += `
          <tr class="departure-row ${departureState}">
            <td class="train"><strong>${train}</strong></td>
            <td class="destination"><span class="destination-text">${destination}</span></td>
            ${config.show_platform ? `<td class="platform">${platform}</td>` : ""}
            <td class="departure">${departure}</td>
            ${!relativeTime ? `<td class="delay">${delayText ? `<span>${delayText}</span>` : ""}</td>` : ""}
          </tr>
        `;
    });

    departuresHtml += `</tbody></table></div></ha-card>`;

    this.innerHTML = departuresHtml;
  }

  // Saves the configuration for the custom card
  setConfig(config) {
    this.config = config;
  }
  modifyConfig(config) {
    const Config = {
        tap_action: {
            action: 'url',
        },
        ...config, 
    };
    return Config;
}

  // Returns a sample configuration for the custom card
  static getStubConfig() {
    return {
      title: "Departures",
      entity: '',
      connections_attribute: 'next_departures',
      displayed_connections: 5,
      fontSize: 's',
      unix_time: false,  
      convertTimeHHMM: false,
      relativeTime: false,
      limit : 60,
      targets: '', 
      exclude: false,
      line: '',
      lineExclude: false,
      train: 'train', 
      departure: 'scheduledTime',
      delay: 'delay',
      platform: 'platform',
      show_platform: true,  // Default to true (platform column always rendered)
      isCancelled: 'isCancelled',
      stopAttribute: 'route',  // Attribute for the stops/route
      filterByStop: '',   // The specific stop to filter by
      stationName: ''  // Your stationName for deleting stops before it
    };
  }
  static getConfigForm() {
    return {
        schema: [
            {
                name: "title",
                required: true,
                selector: { text: {} }
            },
            {
                name: "entity",
                required: true,
                selector: { entity: {} }
            },
            {
                name: "connections_attribute",
                required: true,
                selector: { text: {} }
            },
            {
              type: "constant",
              name: "Properties"              
            },
            {
              name: "",              
              type: "grid",
              multiple: false,
              default: {},  
              schema: [
                { name: "train", selector: { text: {} } },
                { name: "isCancelled", selector: { text: {} } },
                { name: "platform", selector: { text: {} } },
                { name: "show_platform", selector: { boolean: {} } },
              ]
            },
            {
	      type: "constant",
	      name: "Display"
	    },
	    {
	      name: "",
              type: "grid",
	      multiple: false,
              default: {},
	      schema: [
                { name: "displayed_connections", required: true, selector: { number: { min: 1, max: 20, mode: "box" } } },
	        { name: "fontSize", required: true, selector: { select: { mode: "dropdown", options: [
			{ label: "Extra Small", value: "xs" },
			{ label: "Small", value: "s" },
			{ label: "Medium", value: "m" },
			{ label: "Large", value: "l" },
		        { label: "Extra Large", value: "xl" } ] } } }
	      ]
	    },
            {
              type: "constant",
              name: "Time Information"              
            },
            {
              name: "",
              type: "grid",
              multiple: false,
              default: {},  
              schema: [
                { name: "departure", description: "Departure time attribute", selector: { text: {} } },
                { name: "delay", selector: { text: {} } },
                { name: "unix_time", selector: { boolean: {} } },
                { name: "convertTimeHHMM", selector: { boolean: {} } },
                { name: "relativeTime", selector: { boolean: {} } },
                { name: "limit", selector: { number: {min: 1, max: 60, mode: "box" } } }
              ]
            },
            {
              type: "constant",
              name: "Filter"              
            },
            {
              name: "",
              type: "grid",
              multiple: false,
              default: {},  
              schema: [
                { name: "targets", selector: { text: {} } },
                { name: "exclude", selector: { boolean: {} } },
                { name: "line", selector: { text: {} } },
                { name: "lineExclude", selector: { boolean: {} } },
                { name: "stopAttribute", selector: { text: {} } },
                { name: "filterByStop", selector: { text: {} } },
                { name: "stationName", selector: { text: {} } }
              ]
            },
        ]
    };
}
}

// Defines the custom HTML element 'departure-card'
customElements.define('departure-card', DepartureCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "departure-card",
    name: "HA Departure Card",
    preview: true,
    description: "Display your next departures",
    documentationURL: "https://github.com/BagelBeef/ha-departureCard",
});
