// "Englisch Start": Grundwortschatz für Kinder ohne Englischunterricht (Marlon, 2. Klasse).
// Prinzip wie im Grundschul-Englisch: hören, Bild erkennen, nachsprechen; kein Schreiben.
// Konkrete, häufige Wörter in Themen, die Kinder jeden Tag brauchen.
// image: Emoji oder "color:#rrggbb" (Farbfläche). Nur Emoji, die auch auf älteren Fire-Tablets angezeigt werden.
import type { Word, WordList } from '../logic/types'

type Raw = [key: string, en: string, de: string, image: string, example?: string]

interface Theme {
  id: string
  title: string
  words: Raw[]
}

const themes: Theme[] = [
  {
    id: 'start-01',
    title: 'Farben',
    words: [
      ['red', 'red', 'rot', 'color:#e63946', 'The apple is red.'],
      ['blue', 'blue', 'blau', 'color:#1d4ed8', 'The sky is blue.'],
      ['green', 'green', 'grün', 'color:#22a447', 'The tree is green.'],
      ['yellow', 'yellow', 'gelb', 'color:#ffd23f', 'The sun is yellow.'],
      ['orange', 'orange', 'orange', 'color:#f97316', 'My ball is orange.'],
      ['purple', 'purple', 'lila', 'color:#7c3aed', 'I like purple.'],
      ['pink', 'pink', 'rosa', 'color:#f472b6', 'The pig is pink.'],
      ['black', 'black', 'schwarz', 'color:#111111', 'The cat is black.'],
      ['white', 'white', 'weiß', 'color:#ffffff', 'Snow is white.'],
      ['brown', 'brown', 'braun', 'color:#8b5a2b', 'The dog is brown.'],
    ],
  },
  {
    id: 'start-02',
    title: 'Zahlen 1–10',
    words: [
      ['one', 'one', 'eins', '1️⃣', 'I have one nose.'],
      ['two', 'two', 'zwei', '2️⃣', 'I have two eyes.'],
      ['three', 'three', 'drei', '3️⃣', 'Three little pigs.'],
      ['four', 'four', 'vier', '4️⃣', 'A dog has four legs.'],
      ['five', 'five', 'fünf', '5️⃣', 'I have five fingers.'],
      ['six', 'six', 'sechs', '6️⃣'],
      ['seven', 'seven', 'sieben', '7️⃣', 'I am seven.'],
      ['eight', 'eight', 'acht', '8️⃣'],
      ['nine', 'nine', 'neun', '9️⃣'],
      ['ten', 'ten', 'zehn', '🔟', 'I have ten toes.'],
    ],
  },
  {
    id: 'start-03',
    title: 'Tiere',
    words: [
      ['dog', 'dog', 'der Hund', '🐶', 'The dog says woof.'],
      ['cat', 'cat', 'die Katze', '🐱', 'The cat says meow.'],
      ['mouse', 'mouse', 'die Maus', '🐭', 'The mouse is small.'],
      ['horse', 'horse', 'das Pferd', '🐴', 'I can ride a horse.'],
      ['cow', 'cow', 'die Kuh', '🐮', 'The cow says moo.'],
      ['pig', 'pig', 'das Schwein', '🐷', 'The pig is pink.'],
      ['bird', 'bird', 'der Vogel', '🐦', 'The bird can fly.'],
      ['fish', 'fish', 'der Fisch', '🐟', 'The fish can swim.'],
      ['duck', 'duck', 'die Ente', '🦆', 'The duck says quack.'],
      ['rabbit', 'rabbit', 'der Hase', '🐰', 'The rabbit can jump.'],
      ['lion', 'lion', 'der Löwe', '🦁', 'The lion is strong.'],
      ['elephant', 'elephant', 'der Elefant', '🐘', 'The elephant is big.'],
    ],
  },
  {
    id: 'start-04',
    title: 'Familie',
    words: [
      ['mum', 'mum', 'die Mama', '👩', 'I love my mum.'],
      ['dad', 'dad', 'der Papa', '👨', 'I love my dad.'],
      ['brother', 'brother', 'der Bruder', '👦', 'Milan is my brother.'],
      ['sister', 'sister', 'die Schwester', '👧', 'She is my sister.'],
      ['baby', 'baby', 'das Baby', '👶', 'The baby is small.'],
      ['grandma', 'grandma', 'die Oma', '👵', 'My grandma is nice.'],
      ['grandpa', 'grandpa', 'der Opa', '👴', 'My grandpa is nice.'],
      ['family', 'family', 'die Familie', '👨‍👩‍👦‍👦', 'This is my family.'],
      ['friend', 'friend', 'der Freund / die Freundin', '🤝', 'You are my friend.'],
    ],
  },
  {
    id: 'start-05',
    title: 'Mein Körper',
    words: [
      ['eye', 'eye', 'das Auge', '👁️', 'I have two eyes.'],
      ['ear', 'ear', 'das Ohr', '👂', 'I hear with my ears.'],
      ['nose', 'nose', 'die Nase', '👃', 'Touch your nose.'],
      ['mouth', 'mouth', 'der Mund', '👄', 'Open your mouth.'],
      ['hand', 'hand', 'die Hand', '✋', 'Clap your hands.'],
      ['foot', 'foot', 'der Fuß', '🦶', 'Stamp your foot.'],
      ['leg', 'leg', 'das Bein', '🦵', 'I have two legs.'],
      ['arm', 'arm', 'der Arm', '💪', 'My arm is strong.'],
      ['tooth', 'tooth', 'der Zahn', '🦷', 'Brush your teeth.'],
      ['hair', 'hair', 'die Haare', '💇', 'My hair is brown.'],
    ],
  },
  {
    id: 'start-06',
    title: 'Essen und Trinken',
    words: [
      ['apple', 'apple', 'der Apfel', '🍎', 'The apple is red.'],
      ['banana', 'banana', 'die Banane', '🍌', 'The banana is yellow.'],
      ['bread', 'bread', 'das Brot', '🍞', 'I like bread.'],
      ['milk', 'milk', 'die Milch', '🥛', 'I drink milk.'],
      ['water', 'water', 'das Wasser', '💧', 'I drink water.'],
      ['egg', 'egg', 'das Ei', '🥚', 'I eat an egg.'],
      ['cheese', 'cheese', 'der Käse', '🧀', 'Mice like cheese.'],
      ['cake', 'cake', 'der Kuchen', '🎂', 'Happy birthday cake!'],
      ['ice cream', 'ice cream', 'das Eis', '🍦', 'I love ice cream.'],
      ['pizza', 'pizza', 'die Pizza', '🍕', 'Pizza is yummy.'],
    ],
  },
  {
    id: 'start-07',
    title: 'Spielen und Schule',
    words: [
      ['ball', 'ball', 'der Ball', '⚽', 'Kick the ball.'],
      ['book', 'book', 'das Buch', '📖', 'Open your book.'],
      ['pen', 'pen', 'der Stift', '🖊️', 'I have a pen.'],
      ['bag', 'bag', 'die Tasche', '🎒', 'My bag is blue.'],
      ['school', 'school', 'die Schule', '🏫', 'I go to school.'],
      ['teacher', 'teacher', 'der Lehrer / die Lehrerin', '👩‍🏫', 'My teacher is nice.'],
      ['car', 'car', 'das Auto', '🚗', 'The car is fast.'],
      ['bike', 'bike', 'das Fahrrad', '🚲', 'I ride my bike.'],
      ['teddy', 'teddy', 'der Teddy', '🧸', 'I love my teddy.'],
      ['game', 'game', 'das Spiel', '🎲', "Let's play a game."],
    ],
  },
  {
    id: 'start-08',
    title: 'Kleidung',
    words: [
      ['t-shirt', 'T-shirt', 'das T-Shirt', '👕', 'My T-shirt is red.'],
      ['trousers', 'trousers', 'die Hose', '👖', 'My trousers are blue.'],
      ['shoes', 'shoes', 'die Schuhe', '👟', 'Put on your shoes.'],
      ['socks', 'socks', 'die Socken', '🧦', 'My socks are green.'],
      ['cap', 'cap', 'die Mütze / Kappe', '🧢', 'I wear a cap.'],
      ['dress', 'dress', 'das Kleid', '👗', 'A pretty dress.'],
      ['jacket', 'jacket', 'die Jacke', '🧥', 'Put on your jacket.'],
      ['gloves', 'gloves', 'die Handschuhe', '🧤', 'It is cold. Wear gloves.'],
      ['scarf', 'scarf', 'der Schal', '🧣', 'My scarf is warm.'],
      ['glasses', 'glasses', 'die Brille', '👓', 'Dad wears glasses.'],
    ],
  },
  {
    id: 'start-09',
    title: 'Wetter und Natur',
    words: [
      ['sun', 'sun', 'die Sonne', '☀️', 'The sun is hot.'],
      ['rain', 'rain', 'der Regen', '🌧️', 'I like the rain.'],
      ['snow', 'snow', 'der Schnee', '❄️', 'Snow is cold.'],
      ['cloud', 'cloud', 'die Wolke', '☁️', 'A big cloud.'],
      ['wind', 'wind', 'der Wind', '💨', 'The wind is strong.'],
      ['rainbow', 'rainbow', 'der Regenbogen', '🌈', 'Look, a rainbow!'],
      ['tree', 'tree', 'der Baum', '🌳', 'The tree is big.'],
      ['flower', 'flower', 'die Blume', '🌸', 'A pink flower.'],
      ['moon', 'moon', 'der Mond', '🌙', 'Good night, moon.'],
      ['star', 'star', 'der Stern', '⭐', 'A little star.'],
    ],
  },
  {
    id: 'start-10',
    title: 'Zuhause',
    words: [
      ['house', 'house', 'das Haus', '🏠', 'This is my house.'],
      ['door', 'door', 'die Tür', '🚪', 'Open the door.'],
      ['bed', 'bed', 'das Bett', '🛏️', 'Time for bed.'],
      ['bath', 'bath', 'die Badewanne', '🛁', 'I take a bath.'],
      ['toilet', 'toilet', 'die Toilette', '🚽'],
      ['key', 'key', 'der Schlüssel', '🔑', 'Where is the key?'],
      ['light', 'light', 'das Licht', '💡', 'Turn on the light.'],
      ['clock', 'clock', 'die Uhr', '⏰', 'Look at the clock.'],
      ['phone', 'phone', 'das Handy', '📱', "Mum's phone."],
      ['TV', 'TV', 'der Fernseher', '📺', 'I watch TV.'],
    ],
  },
  {
    id: 'start-11',
    title: 'Das kann ich',
    words: [
      ['run', 'run', 'rennen', '🏃', 'I can run.'],
      ['swim', 'swim', 'schwimmen', '🏊', 'I can swim.'],
      ['sleep', 'sleep', 'schlafen', '😴', 'I sleep in my bed.'],
      ['sing', 'sing', 'singen', '🎤', 'I can sing.'],
      ['dance', 'dance', 'tanzen', '💃', "Let's dance."],
      ['read', 'read', 'lesen', '📚', 'I can read.'],
      ['write', 'write', 'schreiben', '✍️', 'I can write.'],
      ['climb', 'climb', 'klettern', '🧗', 'I can climb a tree.'],
      ['kick', 'kick', 'schießen (Ball)', '🥅', 'Kick the ball!'],
      ['laugh', 'laugh', 'lachen', '😂', 'We laugh a lot.'],
    ],
  },
  {
    id: 'start-12',
    title: 'Gefühle und kleine Wörter',
    words: [
      ['happy', 'happy', 'froh, glücklich', '😊', 'I am happy.'],
      ['sad', 'sad', 'traurig', '😞', 'I am sad.'],
      ['angry', 'angry', 'wütend', '😠', 'I am angry.'],
      ['scared', 'scared', 'ängstlich', '😱', 'I am scared.'],
      ['hot', 'hot', 'heiß', '🥵', 'It is hot.'],
      ['cold', 'cold', 'kalt', '🥶', 'It is cold.'],
      ['big', 'big', 'groß', '🦒', 'The giraffe is big.'],
      ['small', 'small', 'klein', '🐜', 'The ant is small.'],
      ['yes', 'yes', 'ja', '👍', 'Yes, please.'],
      ['no', 'no', 'nein', '👎', 'No, thank you.'],
      ['hello', 'hello', 'hallo', '👋', 'Hello, I am Marlon.'],
      ['thank you', 'thank you', 'danke', '🙏', 'Thank you very much.'],
    ],
  },
]

export const starterLists: WordList[] = themes.map((t) => ({ id: t.id, title: `Englisch Start – ${t.title}`, subject: 'Englisch Start' }))

export const starterWords: Word[] = themes.flatMap((t) =>
  t.words.map(([key, en, de, image, example], i) => ({
    id: `${t.id}:${key}`,
    listId: t.id,
    order: i,
    en,
    answers: [en],
    de,
    image,
    ...(example ? { example } : {}),
  })),
)

export const isStarterList = (listId: string) => listId.startsWith('start-')
