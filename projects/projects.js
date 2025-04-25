import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('div.projects');


renderProjects(projects, projectsContainer, 'h2');

const titleCount = document.querySelector('.projects-title');
titleCount.textContent = `My ${projects.length} Projects`
