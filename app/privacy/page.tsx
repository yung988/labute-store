export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 font-sans text-black text-xs tracking-wide leading-relaxed">
      <h1 className="text-sm font-medium text-center mb-8 uppercase">
        Zásady ochrany osobních údajů
      </h1>

      <p className="mb-6">
        Společnost YEEZUZ2020 respektuje vaše soukromí a zavazuje se chránit vaše osobní údaje. Tato
        zásada vysvětluje, jak shromažďujeme, používáme a chráníme informace, které nám poskytnete
        prostřednictvím našeho online obchodu.
      </p>

      <h2 className="font-bold underline mb-2">Shromažďování informací</h2>
      <p className="mb-4">
        Při nákupu zboží, registraci nebo komunikaci s námi můžeme shromažďovat následující údaje:
      </p>
      <ul className="list-disc pl-5 mb-6">
        <li>Jméno a příjmení</li>
        <li>Kontaktní údaje (e-mail, telefon, adresa)</li>
        <li>Informace o platbě a transakcích</li>
        <li>IP adresa a informace o zařízení</li>
      </ul>

      <h2 className="font-bold underline mb-2">Použití informací</h2>
      <p className="mb-6">
        Vaše údaje používáme k vyřízení objednávek, poskytování zákaznické podpory, zlepšování
        našich služeb a pro marketingové účely – pouze pokud k tomu dáte souhlas.
      </p>

      <h2 className="font-bold underline mb-2">Sdílení dat</h2>
      <p className="mb-6">
        Vaše údaje nesdílíme s třetími stranami, s výjimkou služeb nezbytných pro fungování našeho
        obchodu (např. platební brány, dopravci). Vždy dbáme na to, aby byly chráněny v souladu s
        platnou legislativou.
      </p>

      <h2 className="font-bold underline mb-2">Bezpečnost</h2>
      <p className="mb-6">
        Přijímáme technická a organizační opatření k ochraně vašich dat proti zneužití, ztrátě či
        neoprávněnému přístupu. Přístup k datům je omezen na oprávněné osoby.
      </p>

      <h2 className="font-bold underline mb-2">Cookies</h2>
      <p className="mb-6">
        Naše webová stránka používá cookies pro analýzu provozu, personalizaci obsahu a zajištění
        funkcí e-shopu. Používáním našich stránek s tímto souhlasíte.
      </p>

      <h2 className="font-bold underline mb-2">Vaše práva</h2>
      <p className="mb-6">
        Máte právo na přístup ke svým osobním údajům, jejich opravu, výmaz nebo omezení zpracování.
        V případě jakýchkoli dotazů nás kontaktujte na e-mailu:
        <span className="block font-semibold mt-1">support@yeezuz2020.com</span>
      </p>

      <h2 className="font-bold underline mb-2">Změny zásad</h2>
      <p className="mb-6">
        Vyhrazujeme si právo tyto zásady kdykoli změnit. Aktualizované znění bude vždy dostupné na
        této stránce.
      </p>

      <p className="text-[10px] mt-12">Poslední aktualizace: duben 2025</p>
    </div>
  );
}
