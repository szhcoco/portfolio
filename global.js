console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// navlinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );

// if (currentLink) {
//   currentLink.classList.add(('current'));
// }



let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/szhcoco', title: 'Profile' },
  {url: 'meta/', title: 'Meta'},
]

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  
  : "/portfolio/"; 

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host != location.host) {
    a.target="_blank";
  }
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="Automatic">Automatic</option>
      <option value="Light">Light</option>
      <option value="Dark">Dark</option>
		</select>
	</label>`,
);

const select = document.querySelector('select');

if ("colorScheme" in localStorage) {
  const color = localStorage.colorScheme;
  document.documentElement.style.setProperty('color-scheme', color);
  select.value = color;
}

select.addEventListener('input', function (event) {
  document.documentElement.style.setProperty('color-scheme', event.target.value);
  localStorage.colorScheme = event.target.value;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    console.log(response);

    const data = await response.json();
    return data;

  } catch (error) {

    console.error('Error fetching or parsing JSON data', error);

  }
}

export function renderProjects(projects, containerElement, headinglevel = 'h2') {
    containerElement.innerHTML = '';


    for (const project of projects) {
        const article = document.createElement('article');

        article.innerHTML = `
            <h3>${project.title}</h3>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
            <div class='project-year'>${project.year}</div>
        `;
    
        containerElement.appendChild(article);
    }
    
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

       
