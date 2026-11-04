// Englisch, Unit 1 "Listening" (Rest) und "Station 2", Vokabelteil S. 234–235 (Lehrbuch S. 19–22).
// Beispielsätze mit (*) sind selbst ergänzt, alle anderen stammen aus dem Buch.
import type { Word, WordList } from '../logic/types'

export const unit1Station2: WordList = { id: 'en-u1s2', title: 'Unit 1 – Station 2', subject: 'Englisch' }

type Raw = Omit<Word, 'id' | 'listId' | 'order'> & { key: string }

const raw: Raw[] = [
  // Listening (Rest)
  { key: 'gym', en: 'gym', answers: ['gym'], de: 'die Turnhalle; das Fitnessstudio', ipa: 'dʒɪm', example: 'We have PE in the gym.', cloze: 'We have PE in the ___.' },
  { key: 'office', en: 'office', answers: ['office'], de: 'das Büro', ipa: 'ˈɒfɪs', example: 'Mr Turner is in the school office.', cloze: 'Mr Turner is in the school ___.' },
  // Station 2, S. 20
  { key: 'day', en: 'day', answers: ['day'], de: 'der Tag', ipa: 'deɪ', example: 'Thursday is a great day.', cloze: 'Thursday is a great ___.' },
  { key: 'like', en: 'to like', answers: ['to like', 'like'], de: 'mögen', ipa: 'laɪk', example: 'I like this book.', cloze: 'I ___ this book.' },
  { key: 'lesson', en: 'lesson', answers: ['lesson'], de: 'die Schulstunde; der Unterricht', ipa: 'ˈlesn', example: 'Maths is my favourite lesson.', cloze: 'Maths is my favourite ___.' },
  { key: 'be-fun', en: 'to be fun', answers: ['to be fun', 'be fun', 'are fun', 'is fun'], de: 'Spaß machen; witzig sein', ipa: 'bi ˈfʌn', example: 'The lessons are fun here.', cloze: 'The lessons ___ here.' },
  { key: 'subject', en: 'subject', answers: ['subject'], de: 'das Schulfach', ipa: 'ˈsʌbdʒɪkt', example: 'English and science are school subjects.', cloze: 'English and science are school ___s.' },
  { key: 'because', en: 'because', answers: ['because'], de: 'weil; da', ipa: 'bɪˈkɒz', example: "I like science because it's fun.", cloze: "I like science ___ it's fun." },
  { key: 'interesting', en: 'interesting', answers: ['interesting'], de: 'interessant', ipa: 'ˈɪntrəstɪŋ', example: 'Science is interesting.', cloze: 'Science is ___.' },
  { key: 'maths', en: 'maths', answers: ['maths', 'Maths'], de: 'Mathematik; Mathe', ipa: 'mæθs', example: 'Maths is OK.', cloze: '___ is OK.' },
  { key: 'art', en: 'art', answers: ['art', 'Art'], de: 'Kunst', ipa: 'ɑːt', example: 'I like art.', cloze: 'I like ___.' },
  { key: 'but', en: 'but', answers: ['but'], de: 'aber', ipa: 'bʌt', example: "My phone is old, but it's OK.", cloze: "My phone is old, ___ it's OK." },
  { key: 'difficult', en: 'difficult', answers: ['difficult'], de: 'schwierig', ipa: 'ˈdɪfɪklt', example: 'Maths is difficult.', cloze: 'Maths is ___.' },
  { key: 'tuesday', en: 'Tuesday', answers: ['Tuesday'], de: 'Dienstag', ipa: 'ˈtjuːzdeɪ', example: 'Tuesday is a boring day.', cloze: '___ is a boring day.', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'thursday', en: 'Thursday', answers: ['Thursday'], de: 'Donnerstag', ipa: 'ˈθɜːzdeɪ', example: 'Thursday is a great day.', cloze: '___ is a great day.', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'theyre', en: "they're (= they are)", answers: ["they're", 'they are'], de: 'sie sind', ipa: 'ðeə (ðeɪ ˈɑː)', example: "They're my friends. They are cool.", cloze: '___ my friends.' },
  { key: 'be-good-at', en: 'to be good at', answers: ['to be good at', 'be good at', 'good at'], de: 'gut sein in', ipa: 'bi ˈgʊd ət', example: "I'm good at English.", cloze: "I'm ___ English." },
  { key: 'friday', en: 'Friday', answers: ['Friday'], de: 'Freitag', ipa: 'ˈfraɪdeɪ', example: 'Thursday, Friday, …', cloze: 'Thursday, ___, …', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'i-dont-like', en: "I don't like …", answers: ["I don't like", 'I do not like'], de: 'Ich mag … nicht; … gefällt mir nicht.', ipa: 'aɪ ˌdəʊnt ˈlaɪk', example: "I don't like maths. (*)", cloze: '___ maths.', note: "Gegenteil: I like …" },
  { key: 'wednesday', en: 'Wednesday', answers: ['Wednesday'], de: 'Mittwoch', ipa: 'ˈwenzdeɪ', example: 'Wednesday is a fun day. (*)', cloze: '___ is a fun day.', note: 'Das d wird nicht gesprochen. Wochentage immer groß!', caseSensitive: true },
  { key: 'pe', en: 'PE (= Physical Education)', answers: ['PE', 'P.E.', 'Physical Education'], de: 'Sportunterricht', ipa: 'ˌpiːˈiː', example: 'We have PE in the gym.', cloze: 'We have ___ in the gym.', caseSensitive: true },
  { key: 'boring', en: 'boring', answers: ['boring'], de: 'langweilig', ipa: 'ˈbɔːrɪŋ', example: 'Tuesday is a boring day.', cloze: 'Tuesday is a ___ day.', note: 'Gegenteil: interesting' },
  { key: 'easy', en: 'easy', answers: ['easy'], de: 'einfach; leicht', ipa: 'ˈiːzi', example: 'English is easy. (*)', cloze: 'English is ___.', note: 'Gegenteil: difficult' },
  { key: 'with', en: 'with', answers: ['with'], de: 'mit', ipa: 'wɪð', example: 'I can help you with this.', cloze: 'I can help you ___ this.' },
  { key: 'homework', en: 'homework', answers: ['homework'], de: 'die Hausaufgabe, die Hausaufgaben', ipa: 'ˈhəʊmwɜːk', example: 'This is your homework. We have maths homework.', cloze: 'This is your ___.', note: 'Nur Einzahl, auch für „die Hausaufgaben“: nie „homeworks“!' },
  // S. 235
  { key: 'sure', en: 'sure', answers: ['sure'], de: 'sicher', ipa: 'ʃʊə', example: 'Sure, you can have my book.', cloze: '___, you can have my book.' },
  { key: 'number', en: 'number', answers: ['number'], de: 'die Zahl; die Nummer; die Anzahl', ipa: 'ˈnʌmbə', example: 'Numbers: zero, one, two, three, four, …', cloze: '___s: zero, one, two, three, four, …' },
  { key: 'experiment', en: 'experiment', answers: ['experiment'], de: 'der Versuch; das Experiment', ipa: 'ɪkˈsperɪmənt', example: 'Science is fun with an experiment. (*)', cloze: 'Science is fun with an ___.', note: 'Die Betonung liegt hier: exPERiment.' },
  { key: 'sport', en: 'sport', answers: ['sport'], de: 'der Sport; die Sportart', ipa: 'spɔːt', example: 'My favourite sport is football. (*)', cloze: 'My favourite ___ is football.', note: 'Achtung Aussprache!' },
  { key: 'saturday', en: 'Saturday', answers: ['Saturday'], de: 'Samstag', ipa: 'ˈsætədeɪ', example: 'Saturday – no school!', cloze: '___ – no school!', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'sunday', en: 'Sunday', answers: ['Sunday'], de: 'Sonntag', ipa: 'ˈsʌndeɪ', example: 'Sunday! Nice and quiet!', cloze: '___! Nice and quiet!', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'monday', en: 'Monday', answers: ['Monday'], de: 'Montag', ipa: 'ˈmʌndeɪ', example: 'My favourite day is Monday.', cloze: 'My favourite day is ___.', note: 'Wochentage immer groß!', caseSensitive: true },
  { key: 'biology', en: 'biology', answers: ['biology', 'Biology'], de: 'Biologie', ipa: 'baɪˈɒlədʒi', example: 'Biology is interesting. (*)', cloze: '___ is interesting.', note: 'Die Betonung liegt hier: biOLogy.' },
  { key: 'geography', en: 'geography', answers: ['geography', 'Geography'], de: 'Erdkunde; Geografie', ipa: 'dʒiˈɒgrəfi', example: 'I like geography. (*)', cloze: 'I like ___.', note: 'Die Betonung liegt hier: geOGraphy.' },
  { key: 'german', en: 'German', answers: ['German'], de: 'Deutsch', ipa: 'ˈdʒɜːmən', example: 'German is easy.', cloze: '___ is easy.', note: 'Achtung Schreibweise: immer groß!', caseSensitive: true },
  { key: 'history', en: 'history', answers: ['history', 'History'], de: 'Geschichte', ipa: 'ˈhɪstri', example: 'History is a difficult subject.', cloze: '___ is a difficult subject.' },
  { key: 'it', en: 'IT (= Information Technology)', answers: ['IT', 'Information Technology'], de: 'Informatik; Computerunterricht', ipa: 'ˌaɪˈtiː', example: "IT? – Where's my tablet?", cloze: "___? – Where's my tablet?", caseSensitive: true },
  { key: 'technology', en: 'technology', answers: ['technology'], de: 'Technik', ipa: 'tekˈnɒlədʒi', example: 'I like technology. (*)', cloze: 'I like ___.', note: 'Die Betonung liegt hier: techNOLogy.' },
  { key: 'drama', en: 'drama', answers: ['drama', 'Drama'], de: 'Theater; Drama', ipa: 'ˈdrɑːmə', example: 'Drama is a boring subject.', cloze: '___ is a boring subject.' },
  { key: 'tutor-time', en: 'tutor time', answers: ['tutor time'], de: 'die Klassenstunde', ipa: 'ˈtjuːtə ˌtaɪm', example: 'Tutor time is time for your tutor.', cloze: '___ is time for your tutor.' },
  { key: 're', en: 'RE (= Religious Education)', answers: ['RE', 'R.E.', 'Religious Education'], de: 'Religionsunterricht', ipa: 'ˌɑːˈriː', example: 'RE is on Wednesday.', cloze: '___ is on Wednesday.', caseSensitive: true },
  // S. 22
  { key: 'we', en: 'we', answers: ['we'], de: 'wir', ipa: 'wiː', example: "We are in Mr Turner's class.", cloze: "___ are in Mr Turner's class." },
  { key: 'cat', en: 'cat', answers: ['cat'], de: 'die Katze', ipa: 'kæt', example: 'My cat is black. (*)', cloze: 'My ___ is black.' },
]

export const unit1Station2Words: Word[] = raw.map(({ key, ...w }, i) => ({ ...w, id: `${unit1Station2.id}:${key}`, listId: unit1Station2.id, order: i }))
