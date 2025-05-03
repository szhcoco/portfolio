import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';




const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('div.projects');


renderProjects(projects, projectsContainer, 'h2');

const titleCount = document.querySelector('.projects-title');
titleCount.textContent = `My ${projects.length} Projects`


let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// let arc = arcGenerator({
//     startAngle: 0,
//     endAngle: 2* Math.PI,
// });

// d3.select('svg').append('path').attr('d', arc).attr('fill', 'red');


// let rolledData = d3.rollups(
//     projects,
//     (v) => v.length,
//     (d) => d.year,
// );

// let data = rolledData.map(([year, count]) => {
//     return { value: count, label: year };
//   });

// let sliceGenerator = d3.pie().value((d) => d.value);
// let arcData = sliceGenerator(data);
// let arcs = arcData.map((d) => arcGenerator(d));


// let colors = d3.scaleOrdinal(d3.schemeTableau10);
// arcs.forEach((arc, idx) => {
    
//     d3.select('svg').append('path').attr('d', arc).attr('fill', colors(idx));
// })


// let legend = d3.select('.legend');
// data.forEach((d, idx) => {
//   legend
//     .append('li')
//     .attr('class', 'legend-item')
//     .attr('style', `--color:${colors(idx)}`) 
//     .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
// });


let query = '';
let searchInput = document.querySelector('.searchBar');

// searchInput.addEventListener('change', (event) => {

//   // update query value
//   query = event.target.value;

//   // filter projects
//   let filteredProjects = projects.filter((project) => {
//     let values = Object.values(project).join('\n').toLowerCase();
//     return values.includes(query.toLowerCase());
//   });

//   // render filtered projects
//   renderProjects(filteredProjects, projectsContainer, 'h2');
// });

function setQuery(query) {
    return projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });
}

 // highlight selected wedge
 let selectedIndex = -1;


function renderPieChart(projectsGiven) {
    // re-calculate rolled data
    let newRolledData = d3.rollups(
      projectsGiven,
      (v) => v.length,
      (d) => d.year,
    );

    // re-calculate data
    let newData = newRolledData.map(([year, count]) => {
      return { value: count, label: year }; 
    });

    // re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));

    // clear up path and legend
    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();
    let legend = d3.select('.legend');
    legend.selectAll('*').remove();

    // update paths and legend
    let colors = d3.scaleOrdinal(d3.schemePaired);
    newArcs.forEach((arc, idx) => {
        
        newSVG.append('path').attr('d', arc).attr('fill', colors(idx)).on('click', () => {
            selectedIndex = selectedIndex === idx ? -1 : idx;

            newSVG.selectAll('path').attr('class', (_, idx) => (
                idx === selectedIndex ? 'selected' : ''
            ));

            legend.selectAll('li').attr('class', (_, idx) => (
                idx === selectedIndex ? 'selected' : ''
            ));

            if (selectedIndex === -1) {
                renderProjects(projectsGiven, projectsContainer, 'h2');
            } else {
                let selectedLabel = newData[selectedIndex].label;
                let selectedProjects = projectsGiven.filter(p => p.year === selectedLabel);
                renderProjects(selectedProjects, projectsContainer, 'h2');
            }

        });
    })




    newData.forEach((d, idx) => {
    legend
        .append('li')
        .attr('class', 'legend-item')
        .attr('style', `--color:${colors(idx)}`) 
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });

  }

  renderPieChart(projects);
  
  searchInput.addEventListener('change', (event) => {
    let filteredProjects = setQuery(event.target.value);
  
    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
  });










