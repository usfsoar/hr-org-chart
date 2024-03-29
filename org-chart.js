/** Location of SOAR's Position Database on Google Sheets. */
const POSITION_DB_URL = 'https://docs.google.com/spreadsheets/d/16K7XM1Q1_Ps4sU1KsbU2xdkuY-7JjMlh9wt5wEAcPS4/gviz/tq?gid=Positions&headers=1';
/** Indexes of columns in the positions sheet. */
const COL_INDICES = {
  TEAM: 0,
  POSITION: 1,
  UNIQUE_NAME: 2,
  HELD_BY: 3,
  RESPORTS_TO: 4,
  ACCEPTING_APPLICATIONS: 5,
  POSITION_DESCRIPTION: 6,
  COMMENTS: 7,
};
/** HTML ID of the org chart container. */
const CONTAINER_ID = 'orgChartContainer';
/** URL to direct prospective applicants to. */
const ACCEPTING_APPLICATIONS_URL = 'http://usfsoar.com/positions';

google.charts.load('current', {packages: ['orgchart']});
google.charts.setOnLoadCallback(loadData);

/** Load the positions data from Google Sheets. */
function loadData() {
  let query = new google.visualization.Query(POSITION_DB_URL);
  query.send(handleDataResponse);
}

/**
 * Process and filter the response data.
 * @param {google.visualization.QueryResponse} response The response object.
 */
function handleDataResponse(response) {
  let data = response.getDataTable();
  let newColumnIndex = data.getNumberOfColumns();
  data.addColumn('string', 'OrgChartNodeContent');

  for (let row = 0; row < data.getNumberOfRows(); row++) {
    let positionName = data.getValue(row, COL_INDICES.POSITION);
    let positionTeam = data.getValue(row, COL_INDICES.TEAM);
    let positionHeldBy = data.getValue(row, COL_INDICES.HELD_BY);
    let positionOpen =
        data.getValue(row, COL_INDICES.ACCEPTING_APPLICATIONS) === 'Yes';
    let formatted =
        `<div class="orgChart-node-flex">
          <span class="orgChart-node-team">${positionTeam}</span>
          <span class="orgChart-node-position">${positionName}</span>
          ${positionHeldBy
              ? `<span class="orgChart-node-heldBy">${positionHeldBy}</span>`
              : ''}
          ${positionOpen
              ? `<span class="orgChart-node-open">
                  <a href="${ACCEPTING_APPLICATIONS_URL}">Open - Apply Now!</a>
                </span>`
              : ''}
          ${(!positionHeldBy && !positionOpen)
              ? `<span class="orgChart-node-spaceFiller"> </span>`
              : ``}
        </div>`;

    data.setCell(
      row,
      newColumnIndex,
      data.getValue(row, COL_INDICES.UNIQUE_NAME), formatted);
  }

  let unfilteredDataView = new google.visualization.DataView(data);
  unfilteredDataView.setColumns([
    newColumnIndex,
    COL_INDICES.RESPORTS_TO,
    COL_INDICES.HELD_BY,
    COL_INDICES.TEAM, // For filtering; ignored by org chart
  ]);

  initOrgChart(unfilteredDataView);
}

/**
 * Create the org chart object and then draw the chart and initialize the filter
 * buttons.
 * @param {google.visualization.DataView} unfilteredData
 */
function initOrgChart(unfilteredData) {
  const container = document.getElementById(CONTAINER_ID);
  const orgChart = new google.visualization.OrgChart(container);

  drawOrgChart(orgChart, unfilteredData);
  applyLinkedFilterIfPresent(orgChart, unfilteredData);
  initFilterButtons(orgChart, unfilteredData);
}

/**
 * Draw the chart using the data from the filter.
 * @param {google.visualization.OrgChart} chart The chart object.
 * @param {google.visualization.DataView} data
 */
function drawOrgChart(chart, data) {
  chart.draw(data, {
    allowCollapse: true,
    allowHtml: true,
    nodeClass: 'orgChart-node',
    selectedNodeClass: 'orgChart-node--selected',
  });
}

/**
 * Detect if the url contains a filter, and if so, apply that filter. Allows for
 * linking directly to filtered org charts.
 * @param {google.visualization.OrgChart} chart The chart object.
 * @param {google.visualization.DataView} unfilteredData The chart's
 * unfiltered data view.
 */
function applyLinkedFilterIfPresent(chart, unfilteredData) {
  let hash = window.location.hash;
  if (hash) {
    let filter = hash.substr(1).replace('+', ' '); // Remove '#', replace spaces
    console.log(filter);

    /** All allowed filter strings, pulled from the filter buttons. */
    let filters = [...document.querySelectorAll('.filterButton')]
        .map(button => button.dataset.filter);

    if (filters.indexOf(filter) !== -1) {
      // Is a valid filter string
      filterChartData(chart, unfilteredData, filter);
      clearFilterButtonsActiveClass();
      document.querySelectorAll(`.filterButton[data-filter='${filter}']`)
          .forEach(button => button.classList.add('filterButton--active'));
    }
  }
}

/**
 * Filter the data by team name and redraw chart.
 * @param {google.visualization.OrgChart} chart The chart object.
 * @param {google.visualization.DataView} unfilteredData The chart's
 * unfiltered data view.
 * @param {?string} [teamName] The exact name of the team to show, or a falsy
 * value to show all positions.
 */
function filterChartData(chart, unfilteredData, teamName) {
  let filteredDataView = new google.visualization.DataView(unfilteredData);

  if (teamName) {
    let matchingRows = filteredDataView.getFilteredRows([{
      column: 3,
      value: teamName,
    }]);
    filteredDataView.setRows(matchingRows);
  }

  drawOrgChart(chart, filteredDataView);
}

/**
 * Initalize the filter buttons by binding event listeners.
 * @param {google.visualization.OrgChart} chart The chart object.
 * @param {google.visualization.DataView} unfilteredData The chart's unfiltered
 * data view.
 */
function initFilterButtons(chart, unfilteredData) {
  let filterButtons = document.querySelectorAll('.filterButton');

  filterButtons.forEach(filterButton => {
    filterButton.addEventListener('click', event => {
      let filter = event.target.dataset.filter;
      filterChartData(chart, unfilteredData, filter);
      clearFilterButtonsActiveClass();
      filterButton.classList.add('filterButton--active');
      window.location.hash = filter.replace(' ', '+'); // For linking
    });
  });
}

/**
 * Remove the `--active` modifier from all filter buttons.
 */
function clearFilterButtonsActiveClass() {
  let filterButtons = document.querySelectorAll('.filterButton');
  filterButtons.forEach(
      filterButton => filterButton.classList.remove('filterButton--active'));
}
