import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// read the csv file:
async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        // copy all original csv fields into the returned data
        ...row,

        // convert data types
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.data + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    
    
    return data;
}



function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/YOUR_REPO/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,

                // time as a decimal 
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            // add lines array as a hidden property
            Object.defineProperty(ret, 'lines', {
                value: lines,
                configurable: true,
                writable: true,
                enumerable: false,
            })

            return ret;
        })
        .sort((a, b) => a.datetime - b.datetime);
}


// display stats
function renderCommitInfo(data, commits) {
    // Create the dl element
    const stats = d3.select('#stats')
    stats.selectAll('*').remove();
    
    const dl = stats.append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Add total number of files
    let filteredLines = commits.flatMap(c => c.lines);
    let totalFiles = d3.group(filteredLines, d => d.file).size;
    dl.append('dt').text('Total files');
    dl.append('dd').text(totalFiles);

    // add total number of lines
    let totalLen = d3.sum(filteredLines, d => d.length);
    dl.append('dt').text('Total lines');
    dl.append('dd').text(totalLen);

    // maximum depth
    let maxDepth = d3.max(filteredLines, d => d.depth);
    dl.append('dt').text('Max depth');
    dl.append('dd').text(maxDepth);

    // Add time of day that the most work is done
    // const workByPeriod = d3.rollups(
    //     data, 
    //     (v) => v.length,
    //     (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short'}),
    // );
    // const maxPeriod = d3.greatest(workByPeriod, (d) => d[1]) ?.[0];
    // dl.append('dt').text('Time of Day that Most Work is Done');
    // dl.append('dd').text(maxPeriod);


}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {dateStyle: 'full'});
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }

  
let xScale;
let yScale;
// visualize time and day of commits in a scatterplot
function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;


    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        // extent computes the max and min values
        .domain(d3.extent(commits, (d) => d.datetime))
        // how the values from domain mapped to coordinates
        .range([0, width])
        .nice();

    // in svg the y-axis starts at the top: 0 is the top-left corner for range
    
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0])

    // add circles to svg
    const dots = svg.append('g').attr('class', 'dots');

    // calculate the range of edited lines for chaning the size of the dots
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([4, 30]);

     // sort commits by total lines in descending order, so that smaller dots are above larger ones
    const sortedCommits = d3.sort(commits, (d)=> -d.totalLines);

    dots
        .selectAll('circle')
        .data(sortedCommits, (d)=>d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7)
        .style('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        })
    
    // add axis
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        // start at y = 10 (y increase from top to bottom)
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);


    // add grid lines
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));


    // add axis
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');


    // render xaxis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis')
        .call(xAxis);
    
    // render yaxis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis')
        .call(yAxis);
}


function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
  
    const svg = d3.select('#chart').select('svg');
  
    xScale = d3.scaleTime().domain(d3.extent(commits, (d) => d.datetime)).range([0, width]).nice();
  
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  
    const xAxis = d3.axisBottom(xScale);
  
    // CHANGE: we should clear out the existing xAxis and then create a new one.
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);
  
    const dots = svg.select('g.dots');
  
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
      .selectAll('circle')
      .data(sortedCommits, (d) => d.id)
      .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r', (d) => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7) // Add transparency for overlapping dots
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });


  }




function createBrushSelector(svg) {
    svg.call(d3.brush());
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
        isCommitSelected(selection, d),
    );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);

}


function isCommitSelected(selection, commit) {
    if(!selection) {
        return false;
    }
    console.log(commit.datetime);
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac); 
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;

}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
 }

 function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];

        const container = document.getElementById('language-breakdown');

        if (selectedCommits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const requiredCommits = selectedCommits.length ? selectedCommits : commits;

        const lines = requiredCommits.flatMap((d) => d.lines);

        const breakdown = d3.rollup(
            lines, 
            (v) => v.length,
            (d) => d.type,
        );

        container.innerHTML = '';

        for (const [language, count] of breakdown) {
            const proportion = count / lines.length;
            const formatted = d3.format('.1~%')(proportion);

            container.innerHTML += `
                    <dt>${language}</dt>
                    <dd>${count} lines (${formatted})</dd>
                `;
        }

 }
  


let data = await loadData();
let commits = processCommits(data);

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

let filteredCommits = commits;

function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3
        .groups(lines, (d)=> d.file)
        .map(([name, lines]) => {
            return {name, lines};
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    let filesContainer = d3
        .select('#files')
        .selectAll('div')
        .data(files, (d) => d.name)
        .join(
            (enter) =>
                enter.append('div').call((div) => {
                div.append('dt').append('code');
                div.append('dd');
            }),
        );

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    filesContainer.select('dt > code').html((d) => `${d.name}<small>${d.lines.length} lines</small>`);
    filesContainer.select('dd').selectAll('div').data((d)=>d.lines).join('div').attr('class', 'loc').attr('style', (d) => `--color: ${colors(d.type)}`);
}

const timeSlider = document.getElementById('commit-progress');
const selectedTime = document.getElementById('commit-time');


function onTimeSliderChange() {
    const timeFilter = Number(timeSlider.value);
    commitProgress = timeFilter;
    commitMaxTime = timeScale.invert(commitProgress);

    selectedTime.textContent = commitMaxTime.toLocaleString({dateStyle: "long", timeScale: "short"});

    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime)

    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
    renderCommitInfo(data, filteredCommits);
}

timeSlider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange();



renderScatterPlot(data, commits);
createBrushSelector(d3.select("svg"));
d3.select("svg").call(d3.brush().on('start brush end', brushed));



d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  function onStepEnter(response) {
    const time = response.element.__data__.datetime;

    filteredCommits = commits.filter((d) => d.datetime <= time);

    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
    renderCommitInfo(data, filteredCommits);
  }


  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);
