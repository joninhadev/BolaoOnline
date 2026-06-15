async function check() {
  const html = await (await fetch('https://bolao-online-gy51.vercel.app/')).text();
  const cssLinkMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
  if (!cssLinkMatch) return console.log("CSS not found");
  const css = await (await fetch('https://bolao-online-gy51.vercel.app' + cssLinkMatch[1])).text();
  console.log("Has column:", css.includes('flex-direction:column') || css.includes('flex-direction: column'));
}
check();
