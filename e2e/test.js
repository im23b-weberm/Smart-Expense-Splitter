import { Selector } from 'testcafe';

fixture('Wikipedia Random Page Test')
  .page('https://en.wikipedia.org/wiki/Benjamin_Netanyahu');

test('Follow first Wikipedia links until Philosophy or loop', async (t) => {
  const visited = new Set();
  const maxSteps = 1000;

  for (let step = 0; step < maxSteps; step++) {
    const title = await getTitleText(t);
    console.log(`Step ${step + 1}: ${title}`);

    // 🎯 Ziel erreicht
    if (title === 'Philosophy') {
      console.log('🎉 Reached Philosophy!');
      return;
    }

    // 🔁 Schleife erkannt
    if (visited.has(title)) {
      console.log('🔁 Loop detected!');
      return;
    }

    visited.add(title);

    // 👉 nächsten gültigen Link holen
    const link = await getFirstValidLink(t);

    // Debug (optional)
    const linkText = await link.innerText;

    // klicken
    await t.click(link);
  }

  console.log('⚠️ Max steps reached');
});

// 📌 Seitentitel holen
const getTitleText = async (t) => {
  const title = Selector('#firstHeading');
  await t.expect(title.exists).ok({ timeout: 10000 });
  return await title.innerText;
};

// 📌 ersten gültigen Link finden
const getFirstValidLink = async (t) => {
  const content = Selector('#mw-content-text');
  await t.expect(content.exists).ok({ timeout: 10000 });

  const firstValidLink = content
    .find('p a')
    .filter((node) => {
      const href = node.getAttribute('href');

      return (
        // Muss ein echter Wiki-Artikel sein
        href?.startsWith('/wiki/') &&

        // ❌ KEINE Spezialseiten (wichtig!)
        !href.includes(':') &&

        // ❌ keine Sprunglinks
        !href.includes('#') &&

        // ❌ nicht in kursiv (z.B. Aussprache)
        !node.closest('i') &&

        // ❌ keine Referenzen
        !node.closest('sup') &&

        // ❌ nicht in Infobox
        !node.closest('.infobox')
      );
    })
    .nth(0);

  await t.expect(firstValidLink.exists).ok({ timeout: 10000 });
  return firstValidLink;
};