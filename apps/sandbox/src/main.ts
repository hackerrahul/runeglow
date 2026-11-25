/* One page for every library in every way of using it outside Svelte:
   /?lib=bot-avatars&fw=react. A page is a file, src/<library>/<framework>.ts,
   whose default export draws the library's demo into the element it is
   given; adding the file is all it takes to add the page. */

type Page = { default: (root: HTMLElement) => void };
const pages = import.meta.glob<Page>('./*/{vanilla,react,vue,elements}.ts');

const FRAMEWORKS = ['vanilla', 'react', 'vue', 'elements'] as const;
const NAMES = { vanilla: 'No framework', react: 'React', vue: 'Vue', elements: 'Custom elements' };

const found = Object.keys(pages).map((path) => path.split('/').slice(1) as [string, string]);
const libraries = [...new Set(found.map(([lib]) => lib))].sort();

const query = new URLSearchParams(location.search);
const lib = query.get('lib') ?? '';
const fw = (query.get('fw') ?? '') as (typeof FRAMEWORKS)[number];

const nav = document.querySelector('#nav') as HTMLElement;
nav.innerHTML = libraries
  .map((name) => {
    const links = FRAMEWORKS.filter((f) => `./${name}/${f}.ts` in pages)
      .map((f) => `<a href="/?lib=${name}&fw=${f}"${name === lib && f === fw ? ' aria-current="page"' : ''}>${f}</a>`)
      .join(' ');
    return `<div><b>${name}</b> ${links}</div>`;
  })
  .join('');

const app = document.querySelector('#app') as HTMLElement;
const load = pages[`./${lib}/${fw}.ts`];
if (load) {
  (document.querySelector('#title') as HTMLElement).textContent = `${lib}: ${NAMES[fw]}`;
  load().then((page) => page.default(app));
} else {
  app.innerHTML = '<p>Pick a library and a framework above. Each page shows the same demo, driven the way that framework drives it.</p>';
}
