export default function OrderPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 font-sans text-black text-xs tracking-wide leading-relaxed">
      <h1 className="text-center text-sm font-medium mb-8">YEEZUZ2020</h1>

      <nav className="flex justify-between text-[10px] mb-8">
        <span>POMOC</span>
        <span>KOŠÍK (0)</span>
      </nav>

      <section className="mb-10">
        <p className="uppercase font-bold">
          Vzhledem k omezené edici a časově omezenému prodeji jsou všechny objednávky závazné. Nelze
          je vrátit, vyměnit ani upravit.
        </p>
        <p className="mt-4 uppercase font-medium">
          Pro zákaznickou podporu zašlete číslo objednávky a dotaz na:
        </p>
        <p className="mt-2 text-lg font-bold text-black">support@yeezuz2020.com</p>
      </section>

      <section className="mb-10">
        <h2 className="font-bold underline text-black mb-2">Objednávky</h2>
        <p>
          Informace o odeslání a sledování zásilky obdržíte e-mailem (nebo SMS, pokud si ji
          zvolíte), jakmile bude objednávka odeslána.
        </p>
        <p className="mt-2">
          Veškeré dotazy ohledně objednávek musí být zaslány písemně do 14 dnů od doručení.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-bold underline text-black mb-2">Daně a celní poplatky</h2>
        <p>
          DPH je účtována v souladu s platnými zákony dle adresy doručení. Při nákupu může být
          zobrazena odhadovaná daňová částka.
        </p>
        <p className="mt-2">
          Přesná výše daně bude vypočtena po odeslání objednávky a uvedena v potvrzení o doručení.
        </p>
        <p className="mt-2">
          Mezinárodní zákazníci odpovídají za všechny celní poplatky, DPH a daně. Sazby se liší dle
          země.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-bold underline text-black mb-2">Doprava a doručení</h2>
        <p>
          Zákazník odpovídá za správnost údajů zadaných při objednávce (adresa, kontaktní údaje,
          platební údaje). Neručíme za odmítnuté nebo vrácené zásilky kvůli chybným údajům. Takové
          zásilky jsou považovány za propadlé bez náhrady.
        </p>
        <p className="mt-2">
          Neručíme za ztracené, odcizené ani poškozené zásilky. Opětovné odeslání je možné na
          náklady zákazníka. Veškeré reklamace řeší zákazník přímo s přepravcem.
        </p>
      </section>

      <section className="text-[10px]">
        <p className="uppercase">
          Používáním tohoto webu a našich produktů souhlasíte s následujícími podmínkami:
        </p>
        <p className="mt-2">
          <a href="/terms" className="underline">
            Obchodní podmínky
          </a>
          ,{" "}
          <a href="/privacy" className="underline">
            Zásady ochrany osobních údajů
          </a>
          .
        </p>
        <p className="mt-6">Děkujeme.</p>
      </section>
    </div>
  );
}
