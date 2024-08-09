/*
Configuration Tool

The Configuration Tool is a software program produced for the European Space
Agency.

The purpose of this tool is to keep under configuration control the changes
in the Ground Segment components of the Copernicus Programme, in the
framework of the Coordination Desk Programme, managed by Telespazio S.p.A.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
You should have received a copy of the GNU General Public License along with
this program. If not, see <http://www.gnu.org/licenses/>.
*/

class ProcessorsViewer {

    constructor() {

        // Acknowledge the instantiation of calendar widget
        console.info('Instantiating timeline widget...');

        // Define the processor releases timeline
        this.timeline = null;

        // Define the identifier of groups in the timeline
        this.groups = new vis.DataSet([
            { id: 1, content: 'S1' },
            { id: 2, content: 'S2' },
            { id: 3, content: 'S3' },
            { id: 4, content: 'S5P' }
        ]);

        // Define the mapping between the group ID and the mission
        this.groupsMap = {
            'S1': 1,
            'S2': 2,
            'S3': 3,
            'S5P': 4
        }

        // Define the mapping between the CSS class of the event and the mission
        this.cssClassMap = {
            'S1': 's1',
            'S2': 's2',
            'S3': 's3',
            'S5P': 's5p'
        };

        // Set the main class members
        this.processorsReleases = [];
        this.processorsEvents = new vis.DataSet();
        this.filteredEvents = new vis.DataSet();
        this.detailsMap = {};
    }

    init() {

        this.initProcessorsTimeline();

        this.loadProcessorsReleases();

    }

    initProcessorsTimeline() {

        // Set the time range of the Timeline
        var minDate = new Date('2014-08-01');
        var maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);

        // Initialize the timeline options
        var options = {
                stack: false,
                min: minDate,
                max: maxDate,
                zoomMin: 1000 * 60 * 60, // one week in milliseconds
                editable: false,
                margin: {
                item: 10, // minimal margin between items
                axis: 5 // minimal margin between items and the axis
            },
            orientation: 'top'
        };

        // Build the timeline
        if (!procViewer.timeline) {
            let container = document.getElementById('processors-timeline');
            procViewer.timeline = new vis.Timeline(container, null, options);
            procViewer.timeline.setGroups(procViewer.groups);
        }
    }

    loadProcessorsReleases() {
        var url = new URL(window.location);
        var configId = url.searchParams.get('id');
        var ajaxCallURL = '/rest/api/processors-releases/' + configId;
        ajaxCall(ajaxCallURL, 'GET', {}, this.successLoadConfiguration, this.errorLoadConfiguration);
    }

    successLoadConfiguration(response) {

        // Store the Interface Configuration as a class member
        console.info("Processors releases configuration loaded.");
        var graph = JSON.parse(formatResponse(response)[0].graph);
        if (graph['processors_releases']) {
            procViewer.processorsReleases = graph['processors_releases'];
        } else {
            procViewer.processorsReleases = [];
        }

        // Loop over the available processing baselines and append the corresponding
        // entry in the relevant table
        var data = new Array();
        for (var i = 0 ; i < procViewer.processorsReleases.length; i++) {

            // Save the interface row in a class member
            var pr = procViewer.processorsReleases[i];
            var event = procViewer.buildEventInstance(pr);
            procViewer.processorsEvents.add(event);
            var detailsPanel = procViewer.buildDetailsPanel(pr);
            procViewer.detailsMap[pr['id']] = detailsPanel;
        }

        // Set the events associated to the processors release of the timeline
        procViewer.timeline.setItems(procViewer.processorsEvents);

        // Set the displayed time range within the last 18 months
        var beg_date = new Date();
        var beg_date_ms = beg_date.getTime() - 548 * 24 * 60 * 60 * 1000;
        var end_date = new Date();
        var end_date_ms = end_date.getTime() + 24 * 60 * 60 * 1000;
        procViewer.timeline.setWindow(beg_date_ms, end_date_ms);

        // Display the details panel on event click
        procViewer.timeline.on('click', function (properties) {
        if (properties.item) {
                $('#processor-release-details').html(procViewer.detailsMap[properties.item]);
            }
        });
    }

    errorLoadConfiguration(response) {
        console.error('Unable to retrieve the Processors releases');
        console.error(response);
        return;
    }

    buildEventInstance(procRelease) {

        // Build the event instance from the processor release
        // Set the event title
        var title = procRelease['processing_baseline'] ? procRelease['processing_baseline'] :
                procRelease['target_ipfs'].toString();

        // Set the group and the class name
        var mission = procRelease['mission'];
        var category_id = procViewer.groupsMap[mission];
        var cssClass = procViewer.cssClassMap[mission];
        if (!procRelease['id'] || !category_id) {
            console.warn("Incomplete record");
            console.warn(procRelease);
        }

        // The start time is based on the processor release date, and the end time is set as 1 hour later
        var start_time = moment(procRelease['release_date'], 'DD/MM/YYYY').toDate();
        var end_time = moment(procRelease['release_date'], 'DD/MM/YYYY').add(1, 'hours').toDate();

        // Enable use of pictures
        var picture = '<img src="/static/assets/img/maintenance.png" style="width: 36px; height: 36px;">';

        // Return the event instance
        return {
            id: procRelease['id'],
            title: title,
            group: category_id,
            start: start_time,
            end: end_time,
            className: cssClass,
            // content: picture,
            type: 'box'
        }
    }

    buildDetailsPanel(procRelease) {

        // Build content to be displayed in the details panel
        var title = procRelease['processing_baseline'] ? procRelease['processing_baseline'] :
                procRelease['target_ipfs'].toString();
        var category = procRelease['mission'];
        var item = procRelease["satellite_units"];

        // Until a full parsing of anomaly text is implemented, the start time is based
        // on the publication date, and the end time is set as 1 hour later
        var start_time = moment(procRelease['release_date'], 'DD/MM/YYYY').toDate();

        // Every impacted datatake shall be linked to the Datatake table
        var detailsContent =
            '<div>' +
                '<p style="font-size: 14px">Processor release:  ' +
                '<span style="font-weight: bold">' + title + '</span></p>' +
                '<p style="font-size: 14px">Mission:  ' +
                '<span style="font-weight: bold">' + category + '</span></p>' +
                '<p style="font-size: 14px">Release date:  ' +
                '<span style="font-weight: bold">' + start_time + '</span></p>' +
                '<p></p>' +
                '<p style="font-size: 14px">Impacted satellite(s):  ' +
                '<span style="font-weight: bold">' + item + '</span></p>' +
                '<p></p>';

        // Append the list of modifications
        detailsContent +=
                '<p style="font-weight: bold; font-size: 14px">Release notes</p>' +
                procRelease['release_notes'];

        // Close the details panel
        detailsContent += '</div>'

        // Return the HTML displayed in the details panel
        return detailsContent;
    }

    filterEvents(filter) {

        // Clear the array hosting the filtered anomalies
        procViewer.filteredEvents = new vis.DataSet();

        // If the filter is not empty, loop over the processors, and display the
        // anomalies matching the filter
        procViewer.processorsEvents.forEach(function(event) {
            if (filter) {
                if (procViewer.detailsMap[event.id].toUpperCase().includes(filter.toUpperCase())) {
                    procViewer.filteredEvents.add(event);
                }
            } else {
                procViewer.filteredEvents.add(event);
            }
        });

        // Update the timeline widget
        procViewer.timeline.setItems(procViewer.filteredEvents);

    }
}

let procViewer = new ProcessorsViewer();