import { format } from "date-fns";
import { nb } from "date-fns/locale";

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK' }).format(amount);
};

// Helper to format date
const formatDate = (date: Date | null) => {
  if (!date) return "løpende";
  return format(new Date(date), 'dd.MM.yyyy', { locale: nb });
};

interface ContractDocumentProps {
  contract: any;
  owner: any;
  tenant: any;
  unit: any;
  property: any;
}

export function ContractDocument({ contract, owner, tenant, unit, property }: ContractDocumentProps) {
  return (
    <div className="font-serif text-sm leading-relaxed space-y-6 p-12 bg-white border shadow-sm max-w-[210mm] mx-auto min-h-[297mm] text-black">
        {/* Header / Title */}
        <div className="text-center mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold uppercase tracking-wider">Leiekontrakt</h1>
            <p className="text-muted-foreground text-xs mt-1">Generert av Eiendomssystem</p>
        </div>

        {/* 1. Partene */}
        <section>
            <h2 className="text-base font-bold mb-4 uppercase tracking-wide border-b border-gray-200 pb-1">1. Partene</h2>
            <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="bg-gray-50 p-4 rounded-sm">
                    <h3 className="font-bold mb-2 uppercase text-xs tracking-wider text-gray-500">Utleier</h3>
                    <p className="font-semibold">{owner.name}</p>
                    <p>{owner.email}</p>
                    <p>{owner.phone || "Telefon ikke registrert"}</p>
                    {/* Placeholder for address as it is not on User model currently */}
                    <p className="text-gray-400 italic mt-1">Adresse ikke registrert</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-sm">
                    <h3 className="font-bold mb-2 uppercase text-xs tracking-wider text-gray-500">Leietaker</h3>
                    <p className="font-semibold">{tenant.name}</p>
                    <p>{tenant.email}</p>
                    <p>{tenant.phone || "Telefon ikke registrert"}</p>
                </div>
            </div>
        </section>

        {/* 2. Leieobjektet */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">2. Leieobjektet</h2>
            <p className="mb-2">
                Leieobjektet ligger i <strong>{property.address}</strong>.
                {unit.name && <span> Enhetsnummer/Navn: <strong>{unit.name}</strong>.</span>}
            </p>
            <p>
                Leieobjektet har <strong>{unit.roomCount} rom</strong> (eksklusiv kjøkken og bad). 
                Størrelse: <strong>{unit.sizeSqm} m²</strong>.
                Inkludert i avtalen er rettigheter til fellesareal med mindre annet er avtalt.
            </p>
        </section>

        {/* 3. Varighet */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">3. Leieforholdets varighet og oppsigelse</h2>
            
            <div className="space-y-4">
                <div>
                    <h3 className="font-bold text-sm">3.1 Type og varighet</h3>
                    <p>
                        Leieforholdet er tidsbestemt. Leieforholdet begynner <strong>{formatDate(contract.startDate)}</strong>, 
                        og opphører <strong>{formatDate(contract.endDate)}</strong> uten forutgående oppsigelse.
                    </p>
                    <p className="mt-2 text-gray-700">
                        Dersom Leietaker ikke flytter ut innen leiekontraktens utløpsdato må Utleier sende Leietaker skriftlig flytteoppfordring innen tre måneder etter utløpsdatoen. Hvis dette ikke gjøres vil leiekontrakten gjøres om til en tidsubestemt leiekontrakt.
                    </p>
                </div>
                
                <div>
                    <h3 className="font-bold text-sm">3.2 Bindingstid</h3>
                    <p>
                        Partene har 12 måneders gjensidig bindingstid. Det innebærer at leiekontrakten er uoppsigelig de første 12 månedene av leiekontraktens varighet. Deretter gjelder avtalt betingelser for oppsigelse som eventuelt definert under.
                    </p>
                </div>

                <div>
                    <h3 className="font-bold text-sm">3.3 Oppsigelse</h3>
                    <p>
                        Leiekontrakten har 3 måneders oppsigelsestid. Leieforholdet løper som normalt ut oppsigelsestiden, og partene skal i denne perioden opprettholde sine plikter etter kontrakten. Dette innebærer at leietaker har rett til å bruke husrommet, samt at leietaker plikter å betale leie ut oppsigelsestiden. Utleier plikter på sine side å stille husrommet til leiers disposisjon i hele oppsigelsestiden.
                    </p>
                </div>
            </div>
        </section>

        {/* 4. Husleien */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">4. Husleien</h2>
            <p className="mb-2">
                Husleien er <strong>{formatCurrency(contract.rentAmount)}</strong> pr. måned.
            </p>
            <div className="bg-gray-50 p-4 rounded-sm space-y-2 text-sm">
                <p><strong>Følgende gjelder for tilleggskostnader:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Internett er <span className="font-semibold text-red-600">ikke inkludert</span> i husleien.</li>
                    <li>Kabel-TV er <span className="font-semibold text-red-600">ikke inkludert</span> i husleien.</li>
                    <li>Vann og avløp er <span className="font-semibold text-green-600">inkludert</span> i husleien.</li>
                    <li>Strøm/oppvarming er <span className="font-semibold text-red-600">ikke inkludert</span> i husleien, og leietaker må tegne et eget strømabonnement gjeldende fra kontraktstart.</li>
                </ul>
            </div>
            <p className="mt-4">
                Det totale beløpet betales den 25. hver måned for påfølgende kalendermåned.
                Beløpet skal betales til bankkonto <strong>9802.35.43559</strong> om leietaker ikke opplyses om annet.
            </p>
        </section>

        {/* 5. Sikkerhet */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">5. Sikkerhet</h2>
            <p>
                Utleier og leietaker har avtalt at som sikkerhet for skyldig husleie, skader på boligen, utgifter ved utkastelse og for andre krav som reiser seg av leiekontrakten skal stilles sikkerhet på <strong>{formatCurrency(contract.depositAmount)}</strong>, jf. husleieloven §§ 3-5 og 3-6.
            </p>
            <p className="mt-2 text-gray-700">
                Leietaker må dokumentere at sikkerhet er reist i henhold til leiekontrakten i rimelig tid før avtalt innflyttingsdato. Leiekontrakten er ikke bindende for utleier før slik dokumentasjon foreligger. Leietaker er ansvarlig for at avtalt sikkerhetsstillelse gjelder i hele leieperioden. Manglende sikkerhetsstillelse vil anses som vesentlig mislighold av leiekontrakten.
            </p>
        </section>

        {/* 6. Regulering */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">6. Regulering av husleien</h2>
            <p className="text-gray-700">
                Partene kan, med én måneds skriftlig varsel, kreve leien regulert i takt med endringene i konsumprisindeksen i tiden etter siste leiefastsetting. Regulering kan tidligst settes i verk 12 måneder etter at siste leiefastsetting ble satt i verk. Dersom leieforholdet har vart i minst to år og seks måneder uten annen leieregulering enn etter konsumprisindeksen, kan begge parter med seks måneders skriftlig varsel kreve at leien blir satt til gjengsleie jf. Husleielovens §4-3.
            </p>
        </section>

        {/* 7. Standard */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">7. Leieobjektets standard og overlevering</h2>
            <div className="space-y-2 text-gray-700">
                <p>
                    Leieobjektet, som er umøblert, overtas i den stand det er. Leieobjektet med tilbehør skal ved overleveringen være ryddet, rengjort og i vanlig god stand.
                </p>
                <p>
                    Leietaker vil ved overtakelse av leieobjektet få utdelt nøkler. Leietaker har ikke uten utleiers samtykke anledning til å kopiere flere nøkler til leieobjektet.
                </p>
                <p>
                    Leietaker er oppfordret til å på forhånd undersøke leieobjektet. Leieobjektet leies ut i den stand den er ved besiktigelsen jf. Husleieloven §2-5. Mangel på leieobjektet vil foreligge dersom leieobjektet er i vesentlig dårligere stand enn leietaker etter forholdene hadde grunn til å regne med, eller dersom det er gitt manglende eller uriktige opplysninger om leieobjektet, og det antas å ha virket inn på avtalen.
                </p>
            </div>
        </section>

        {/* 8. Partenes plikter */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">8. Partenes plikter i leieforholdet</h2>
            
            <div className="space-y-4 text-gray-700">
                <div>
                    <h3 className="font-bold text-sm">8.1 Leietakers plikter</h3>
                    <p>
                        Leietaker plikter å vedlikeholde dørlåser, kraner, vannklosetter, elektriske kontakter og brytere, 
                        varmtvannsbeholdere og inventar og utstyr i husrommet som ikke er en del av den faste eiendommen. 
                        Leietaker plikter også å foreta nødvendig funksjonskontroll, rengjøring, batteriskift, testing og lignende 
                        av røykvarsler og brannslukningsutstyr. Dersom vedlikehold ikke er regningssvarende, påhviler 
                        utskiftning Utleier. Utbedring av tilfeldig skade regnes ikke som vedlikehold.
                    </p>
                    <p className="mt-2">
                        Uten skriftlig forhåndssamtykke fra Utleier kan Leietaker ikke foreta bygningsmessige forandringer 
                        eller nyinnredninger. Uten slikt samtykke kan han heller ikke male, skifte veggbekledning, gulvbelegg 
                        e.l.
                    </p>
                    <p className="mt-2">
                        Leietaker plikter straks å varsle Utleier om enhver skade som trenger omgående utbedring fra Utleiers 
                        side. Andre skader må meldes uten unødig forsinkelse.
                    </p>
                    <p className="mt-2">
                        Leietaker plikter til enhver tid å ha alminnelig innbo- og løsøreforsikring. Utleier kan kreve å få 
                        forsikringsbeviset fremlagt.
                    </p>
                </div>

                <div>
                    <h3 className="font-bold text-sm">8.2 Utleiers plikter</h3>
                    <p>
                        Utleier plikter å stille leieobjektet med avtalt tilbehør til Leietakers disposisjon i hele leieperioden. 
                        Utleier skal holde leieobjektet og eiendommen i den stand som er avtalt eller som for øvrig følger av 
                        husleielovens bestemmelser. Dersom Utleier misligholder disse plikter kan Leietaker gjøre beføyelsene i 
                        husleieloven kapittel 2 og §5-7 gjeldende.
                    </p>
                </div>
            </div>
        </section>

        {/* 9. Husordensregler */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">9. Husordensregler</h2>
            <div className="space-y-2 text-gray-700">
                <p>Leietaker plikter å opprettholde vanlig ro og orden på eiendommen.</p>
                <p>
                    Leietaker plikter å følge vanlige ordensregler og rimelige påbud som Utleier har fastsatt til sikring av 
                    god husorden, og eventuelt de ordensregler mv. som til enhver tid gjelder for eierseksjonssameiet eller 
                    borettslaget.
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Husdyr på eiendommen er ikke tillatt.</li>
                    <li>Røyking i leieobjektet er ikke tillatt.</li>
                </ul>
                <div className="bg-gray-50 p-4 rounded-sm mt-2">
                    <p className="font-semibold text-sm mb-1">Utleier har følgende andre bemerkninger vedrørende husordensregler:</p>
                    <p className="italic">Fellesgang støvsuges og vaskes etter vaskeliste. (Se ordensregler)</p>
                </div>
            </div>
        </section>

        {/* 10. Fremleie */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">10. Fremleie og opptak i husstanden</h2>
            <p className="text-gray-700">
                Leietaker har ikke adgang til å fremleie eller på annen måte overlate sin bruksrett til andre eller oppta 
                personer i sin husstand uten samtykke fra Utleier, med mindre annet følger av ufravikelig 
                lovbestemmelse. Samtykke kan til enhver tid nektes dersom husrommet klart blir overbefolket.
            </p>
        </section>

        {/* 11. Overføring */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">11. Overføring av leieforholdet</h2>
            <p className="text-gray-700">
                Leietaker har ikke adgang til å overføre sine rettigheter eller plikter etter leieavtalen til andre uten 
                samtykke fra Utleier, med mindre annet følger av ufravikelig lovbestemmelse.
            </p>
        </section>

        {/* 12. Opphør */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">12. Leieforholdets opphør – Tilbakelevering m.m.</h2>
            <div className="space-y-2 text-gray-700">
                <p>
                    Ved fraflytting skal Leietaker tilbakelevere leieobjektet, samt tilhørende naglefast herunder løst utstyr i 
                    godt vedlikeholdt stand (og i samme stand som ved overtakelsen, med unntak av den forringelse som 
                    skyldes alminnelig slit og elde, og de mangler som Utleier selv plikter å utbedre), med mindre annet er 
                    avtalt.
                </p>
                <p>
                    Leietaker skal for egen regning sørge for ordentlig rengjøring før leieobjektet fraflyttes, både av gulv, 
                    vegger, tak, skap og vinduer.
                </p>
                <p>
                    Har Leietaker med Utleiers samtykke gjort vesentlige forbedringer i husrommet, kan Leietaker kreve 
                    vederlag for den fordel Utleier oppnår som følge av forbedringene, med mindre annet ble avtalt da 
                    samtykket ble gitt.
                </p>
                <p>
                    Alle nøkler skal tilbakeleveres. Dersom samtlige nøkler ikke tilbakeleveres gjøres Leietaker ansvarlig 
                    for kostnadene i forbindelse med utskifting av lås.
                </p>
                <p>
                    Leietaker plikter å gi Utleier adgang til å holde visninger for både potensielle Leietakere og potensielle 
                    kjøpere de siste 3 månedene av leieforholdet med mindre annet er avtalt.
                </p>
                <p>
                    Tilbakelevering anses skjedd når leieobjektet er rengjort, i samme stand som ved overtakelse, samt at 
                    nøkler er overlevert med mindre annet er særskilt avtalt.
                </p>
            </div>
        </section>

        {/* 13. Tvangsfravikelse */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">13. Tvangsfravikelse</h2>
            <div className="space-y-2 text-gray-700">
                <p>
                    Blir leien ikke betalt ved forfall, og heller ikke innen 14 dager etter at Utleier deretter har sendt 
                    betalingsvarsel, kan Utleier kreve tvangsfravikelse (utkastelse) uten søksmål, jf. 
                    tvangsfullbyrdelsesloven §4-18 jf. §13-2, 3.ledd bokstav a.
                </p>
                <p>
                    Hvis leiekontrakten er utløpt og Leietaker ikke flytter innen 14 dager etter at Utleier deretter har sendt 
                    fraflyttingsvarsel, kan Utleier kreve tvangsfravikelse (utkastelse) uten søksmål, jf. 
                    tvangsfullbyrdelsesloven §4-18 jf. §13-2, 3.ledd bokstav b.
                </p>
                <p>
                    Hvis Utleier hever kontrakten på grunn av vesentlig mislighold, plikter Leietaker å erstatte det leietap 
                    Utleier blir påført. Likeledes må han erstatte alle omkostninger som følge av misligholdet måtte påføre 
                    Utleier, herunder saksomkostninger og utgifter til ryddiggjøring og rengjøring.
                </p>
            </div>
        </section>

        {/* 14. Særlige bestemmelser */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">14. Særlige bestemmelser</h2>
            <p className="text-gray-700">
                Begge parter aksepterer at de registrerte e-epostadresser benyttes i fremtidig kommunikasjon.
            </p>
        </section>

        {/* 15. Husleieloven */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">15. Husleieloven</h2>
            <p className="text-gray-700">
                Ved motstrid mellom bestemmelser i denne avtalen og fravikelige bestemmelser i husleieloven, går 
                denne avtalen foran.
            </p>
        </section>

        {/* 16. Verneting */}
        <section>
            <h2 className="text-base font-bold mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">16. Verneting</h2>
            <div className="space-y-2 text-gray-700">
                <p>Eiendommens adresse er verneting i alle tvistesaker, om ikke annet er avtalt.</p>
                <p>
                    Denne avtalen er elektronisk signert med BankID. Kopier av den signerte avtalen er sendt til Utleier og 
                    Leietaker. Partene har brukt en kontraktsmal fra Husleie.no, Husleie.no er ikke en part i leieforholdet.
                </p>
            </div>
        </section>

        {/* Signatures */}
        <section className="mt-16 pt-8 border-t-2 border-gray-100 break-inside-avoid">
            <h2 className="text-base font-bold mb-8 uppercase tracking-wide">Signering</h2>
            <div className="grid grid-cols-2 gap-16">
                <div>
                    <div className="border-b border-black h-12 mb-2"></div>
                    <p className="font-semibold">{owner.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Utleier</p>
                </div>
                <div>
                    <div className="border-b border-black h-12 mb-2"></div>
                    <p className="font-semibold">{tenant.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Leietaker</p>
                </div>
            </div>
        </section>
    </div>
  );
}
