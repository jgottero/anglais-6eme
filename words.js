/* =====================================================================
   VOCABULARY — this file holds every word. The code lives in
   index.html and rarely changes; this one grows all year.

   Add a word to an existing list:
     { fr: "Mot français", en: ["english word"] },

   Add a whole new list: copy one of the blocks below and change
   Add a whole new list: copy one of the blocks below and change its
   id, title and words. It shows up in the menu on its own.

   Optional keys on a word:
     en:    every accepted answer. The first one is the model
            pronunciation; the others count as synonyms.
     heard: extra spellings the voice recogniser tends to return
            for that word ("high" for hi). Speaking mode only.
     avoid: answers that must never be offered as a wrong choice
            here, because they would in fact be correct too.
            Applies to both quiz directions.
   ===================================================================== */
const VOCABULARY = {
  version: 1,
  lessons: [
    {
      id: "greetings",
      title: "Greetings",
      subtitle: "Saluer et remercier",
      words: [
        { fr: "Bonjour (le matin)", en: ["good morning"], heard: ["goodmorning"], avoid: ["hi", "hello", "hey"] },
        { fr: "Bonjour (l'après-midi)", en: ["good afternoon"], avoid: ["hi", "hello", "hey"] },
        { fr: "Bonsoir", en: ["good evening"] },
        { fr: "Bonne nuit", en: ["good night"], heard: ["goodnight"] },
        { fr: "Au revoir", en: ["goodbye", "bye"], heard: ["good bye", "by", "buy", "bye bye"] },
        { fr: "Salut", en: ["hi", "hello", "hey"], heard: ["high", "hallo", "hay"] },
        { fr: "S'il vous plaît", en: ["please"], heard: ["pleas", "plies"] },
        { fr: "Merci", en: ["thank you", "thanks"], heard: ["thankyou", "thank"] },
        { fr: "Bonne journée", en: ["have a nice day"], heard: ["have nice day"] },
        { fr: "Prenez soin de vous", en: ["take care"], heard: ["takecare"] },
        { fr: "À demain", en: ["see you tomorrow"], heard: ["c u tomorrow", "see u tomorrow"] },
        { fr: "À plus tard", en: ["see you later"], heard: ["c u later", "see u later"] }
      ]
    },
    {
      id: "classroom",
      title: "Classroom instructions",
      subtitle: "Les consignes du professeur",
      words: [
        { fr: "Écoutez-moi", en: ["listen to me"] },
        { fr: "Lisez", en: ["read"], heard: ["red", "reed"] },
        { fr: "Levez la main", en: ["raise your hand"], heard: ["raise you're hand", "raise hand"] },
        { fr: "Levez-vous", en: ["stand up"], heard: ["standup"] },
        { fr: "Fermez", en: ["close"], heard: ["clothes", "cloze"] },
        { fr: "Écrivez", en: ["write"], heard: ["right", "rite"] },
        { fr: "Ouvrez", en: ["open"], heard: ["opened"] },
        { fr: "Asseyez-vous", en: ["sit down"], heard: ["sitdown", "sat down"] },
        { fr: "Prenez votre crayon", en: ["take your pencil"], heard: ["take you're pencil"] },
        { fr: "Taisez-vous", en: ["be quiet"], heard: ["be quite", "bequiet"] }
      ]
    },
    {
      id: "rules",
      title: "School rules",
      subtitle: "Ce qui est interdit",
      words: [
        { fr: "Ne cours pas !", en: ["don't run"] },
        { fr: "Ne mange pas en dehors de la cantine !", en: ["don't eat outside the cafeteria"] },
        { fr: "Ne bois pas !", en: ["don't drink"] },
        { fr: "Ne joue pas avec tes stylos !", en: ["don't play with your pens"], heard: ["don't play with you're pens"] },
        { fr: "Ne dessine pas sur ton bureau !", en: ["don't draw on your desk"], heard: ["don't draw on you're desk"] },
        { fr: "Ne te bats pas avec tes camarades !", en: ["don't fight with your classmates"], heard: ["don't fight with you're classmates", "don't fight with your class mates"] },
        { fr: "Ne mâche pas de chewing-gum !", en: ["don't chew gum"], heard: ["don't chewing gum", "don't shoe gum"] },
        { fr: "Ne sois pas en retard !", en: ["don't be late"] },
        { fr: "N'utilise pas ton téléphone !", en: ["don't use your smartphone"], heard: ["don't use you're smartphone", "don't use your smart phone"] },
        { fr: "Ne jette pas de détritus !", en: ["don't litter"], heard: ["don't liter", "don't little"] }
      ]
    },
    {
      id: "feelings",
      title: "Feelings",
      subtitle: "Dire comment on se sent",
      words: [
        { fr: "Effrayé", en: ["afraid", "scared"], heard: ["a fraid", "scarred"] },
        { fr: "Énervé", en: ["angry"], avoid: ["furious"] },
        { fr: "Furieux", en: ["furious"], avoid: ["angry"] },
        { fr: "Ennuyé", en: ["bored"], heard: ["board", "bord"] },
        { fr: "Triste", en: ["sad"], heard: ["said", "sat"] },
        { fr: "Enthousiaste", en: ["excited"], heard: ["exited"] },
        { fr: "Jaloux", en: ["jealous"], avoid: ["envious"] },
        { fr: "Envieux", en: ["envious"], avoid: ["jealous"] },
        { fr: "Malpoli", en: ["rude"], heard: ["rood"] },
        { fr: "Malade", en: ["sick"], heard: ["six", "sik"] },
        { fr: "Fatigué", en: ["tired"], heard: ["tyred", "tire"] }
      ]
    },
    {
      id: "be",
      title: "To be",
      subtitle: "Verbe être",
      words: [
        { fr: "Je suis", en: ["I am"] },
        { fr: "Tu es", en: ["You are"] },
        { fr: "Il est (garçon ou animal)", en: ["He is"] },
        { fr: "Elle est (fille ou animal)", en: ["She is"] },
        { fr: "C'est (chose ou animal)", en: ["It is"] },
        { fr: "Nous sommes", en: ["We are"] },
        { fr: "Vous êtes", en: ["You are"] },
        { fr: "Ils/Elles sont", en: ["They are"] }
      ]
    },
    {
      id: "days",
      title: "The days",
      subtitle: "Les jours de la semaine",
      words: [
        { fr: "Lundi", en: ["Monday"], heard: ["munday", "mundy"] },
        { fr: "Mardi", en: ["Tuesday"], heard: ["tuesdays", "chewsday", "tiuesday"] },
        { fr: "Mercredi", en: ["Wednesday"], heard: ["wensday", "wendsday", "wednsday"] },
        { fr: "Jeudi", en: ["Thursday"], heard: ["thirsday", "thursdays", "thersday"] },
        { fr: "Vendredi", en: ["Friday"], heard: ["fry day", "fridays"] },
        { fr: "Samedi", en: ["Saturday"], heard: ["saturdays", "satur day", "saterday"] },
        { fr: "Dimanche", en: ["Sunday"], heard: ["sundae", "sundays", "sun day"] }
      ]
    },
    {
      id: "colours",
      title: "The colours",
      subtitle: "Les couleurs",
      words: [
        { fr: "Rouge", en: ["red"], heard: ["read", "rad"] },
        { fr: "Jaune", en: ["yellow"], heard: ["yello", "jello"] },
        { fr: "Vert", en: ["green"], heard: ["grin", "greene"] },
        { fr: "Bleu", en: ["blue"], heard: ["blew", "bloo"] },
        { fr: "Rose", en: ["pink"], heard: ["pinc", "ping"] },
        { fr: "Violet", en: ["purple"], heard: ["purpel", "people", "perple"] }
      ]
    },
    {
      id: "seasons",
      title: "The seasons and months",
      subtitle: "Les saisons et les mois",
      words: [
        /* Grouped by season, as the notebook has them. The months keep
           their capital letter and the seasons do not: that is the rule
           written in the margin of the lesson. */
        { fr: "L'hiver", en: ["winter"], heard: ["winther", "winner"] },
        { fr: "Décembre", en: ["December"], heard: ["desember", "dicember"] },
        { fr: "Janvier", en: ["January"], heard: ["janury", "janiary", "januray"] },
        { fr: "Février", en: ["February"], heard: ["febuary", "febury", "febyuary"] },

        { fr: "Le printemps", en: ["spring"], heard: ["sprint", "springs"] },
        { fr: "Mars", en: ["March"], heard: ["marsh", "mark"] },
        { fr: "Avril", en: ["April"], heard: ["apryl", "a pril"] },
        { fr: "Mai", en: ["May"], heard: ["mae"] },

        { fr: "L'été", en: ["summer"], heard: ["sumer", "some more"] },
        { fr: "Juin", en: ["June"], heard: ["joon", "jun"] },
        { fr: "Juillet", en: ["July"], heard: ["julie", "jully"] },
        { fr: "Août", en: ["August"], heard: ["augest", "agust", "a gust"] },

        { fr: "L'automne", en: ["autumn", "fall"], heard: ["autum", "otum", "ortum"] },
        { fr: "Septembre", en: ["September"], heard: ["septemba", "sep tember"] },
        { fr: "Octobre", en: ["October"], heard: ["octoba", "oc tober"] },
        { fr: "Novembre", en: ["November"], heard: ["novemba", "no vember"] }
      ]
    },
    {
      id: "numbers",
      title: "The numbers",
      subtitle: "Les nombres de 1 à 100",
      words: [
        /* Written as figures, because that is what a number is to a
           child before it is a word. The way one says it out loud is
           what the list teaches. */
        { fr: "1", en: ["one"], heard: ["1", "won"] },
        { fr: "2", en: ["two"], heard: ["2", "too", "to"] },
        { fr: "3", en: ["three"], heard: ["3", "tree"] },
        { fr: "4", en: ["four"], heard: ["4", "for", "fore"] },
        { fr: "5", en: ["five"], heard: ["5", "fife"] },
        { fr: "6", en: ["six"], heard: ["6", "sicks"] },
        { fr: "7", en: ["seven"], heard: ["7", "sevin"] },
        { fr: "8", en: ["eight"], heard: ["8", "ate"] },
        { fr: "9", en: ["nine"], heard: ["9", "nein"] },
        { fr: "10", en: ["ten"], heard: ["10", "tenn"] },
        { fr: "11", en: ["eleven"], heard: ["11", "elevin"] },
        { fr: "12", en: ["twelve"], heard: ["12", "twelf"] },
        { fr: "13", en: ["thirteen"], heard: ["13", "thurteen"] },
        { fr: "14", en: ["fourteen"], heard: ["14", "forteen"] },
        { fr: "15", en: ["fifteen"], heard: ["15", "fifeteen"] },
        { fr: "16", en: ["sixteen"], heard: ["16", "sixten"] },
        { fr: "17", en: ["seventeen"], heard: ["17", "seventen"] },
        { fr: "18", en: ["eighteen"], heard: ["18", "ateteen"] },
        { fr: "19", en: ["nineteen"], heard: ["19", "ninteen"] },
        { fr: "20", en: ["twenty"], heard: ["20", "twenny"] },

        // And then ten at a time, to a hundred.
        { fr: "30", en: ["thirty"], heard: ["30", "thurty"] },
        { fr: "40", en: ["forty"], heard: ["40", "fourty"] },
        { fr: "50", en: ["fifty"], heard: ["50", "fivety"] },
        { fr: "60", en: ["sixty"], heard: ["60", "sixtee"] },
        { fr: "70", en: ["seventy"], heard: ["70", "seventee"] },
        { fr: "80", en: ["eighty"], heard: ["80", "ateee"] },
        { fr: "90", en: ["ninety"], heard: ["90", "ninty"] },
        { fr: "100", en: ["one hundred", "a hundred"], heard: ["100", "hundred"] }
      ]
    }
  ]
};
