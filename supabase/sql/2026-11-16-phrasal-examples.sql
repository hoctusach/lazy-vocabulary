-- 2026-11-16 phrasal-verb example rewrites
-- Purpose: replace 66 example sentences in public.default_vocabulary_base that were
--   verbatim copies of textbook sentences with original rewrites (and one corrected
--   meaning for 'think up'). Mirrors the change made to src/data/defaultVocabulary.json.
-- STATUS: APPLIED to project vijvcojvemkzgpzpowzh on 2026-11-16 (order: backups, A, B, phrasal, vi-meaning, take-down, C, D)
-- Roll back: restore from public.default_vocabulary_base_bak_20261116_phrasal using the
--   commented block at the bottom (run it in its own transaction), then drop the backup.
-- Note: rows 'for the time being' and 'lock up /lɒk ʌp/ 2' are also set by
--   2026-11-16-default-vocab-cleanup.sql section A with the same sentences (idempotent).

BEGIN;

CREATE TABLE IF NOT EXISTS public.default_vocabulary_base_bak_20261116_phrasal AS
SELECT * FROM public.default_vocabulary_base
WHERE word IN (
  $q$hang out /hæŋ aʊt/$q$,
  $q$hang out /hæŋ aʊt/ 2$q$,
  $q$head off /hed ɒf/$q$,
  $q$head off /hed ɒf/ 2$q$,
  $q$hit back /hɪt bæk/$q$,
  $q$hit back /hɪt bæk/ 2$q$,
  $q$laze around /leɪz əˈraʊnd/$q$,
  $q$let on /let ɒn/$q$,
  $q$lie ahead /laɪ əˈhed/$q$,
  $q$liven up /ˈlaɪvn ʌp/$q$,
  $q$liven up /ˈlaɪvn ʌp/ 2$q$,
  $q$hit upon /hɪt əˈpɒn/$q$,
  $q$hit upon /hɪt əˈpɒn/ 2$q$,
  $q$key in /kiː ɪn/$q$,
  $q$kick off (with) /kɪk ɒf (/wɪð/)$q$,
  $q$knock off /nɒk ɒf/$q$,
  $q$make into /meɪk ˈɪntuː/$q$,
  $q$make out /meɪk aʊt/$q$,
  $q$make over /meɪk ˈəʊvər/$q$,
  $q$make up /meɪk ʌp/$q$,
  $q$meet up /miːt ʌp/$q$,
  $q$mess about/around /mes əˈbaʊt əˈraʊnd/$q$,
  $q$step aside /step əˈsaɪd/$q$,
  $q$stop off /stɒp ɒf/$q$,
  $q$store up /stɔːr ʌp/$q$,
  $q$store up /stɔːr ʌp/ 2$q$,
  $q$summon up /ˈsʌmən ʌp/$q$,
  $q$take after /teɪk ˈɑːftər/$q$,
  $q$take apart /teɪk əˈpɑːt/$q$,
  $q$take away /teɪk əˈweɪ/$q$,
  $q$take down /teɪk daʊn/$q$,
  $q$take in /teɪk ɪn/$q$,
  $q$take in /teɪk ɪn/ 2$q$,
  $q$take in /teɪk ɪn/ 3$q$,
  $q$take on /teɪk ɒn/$q$,
  $q$take to /teɪk tə/ 2$q$,
  $q$test out /test aʊt/$q$,
  $q$think over /θɪŋk ˈəʊvər/$q$,
  $q$think up /θɪŋk ʌp/$q$,
  $q$throw out /θrəʊ aʊt/$q$,
  $q$throw up /θrəʊ ʌp/$q$,
  $q$throw up /θrəʊ ʌp/ 2$q$,
  $q$tip up /tɪp ʌp/ 2$q$,
  $q$turn into /tɜːn ˈɪntuː/$q$,
  $q$walk out /wɔːk aʊt/$q$,
  $q$walk out /wɔːk aʊt/ 2$q$,
  $q$ward off /wɔːd ɒf/$q$,
  $q$warm up /wɔːm ʌp/$q$,
  $q$waste away /weɪst ə weɪ/$q$,
  $q$water down /ˈwɔːtə daʊn/$q$,
  $q$water down /ˈwɔːtə daʊn/ 2$q$,
  $q$wear down /weə daʊn/$q$,
  $q$wear down /weə daʊn/ 2$q$,
  $q$wear out /weə aʊt/$q$,
  $q$weigh down /weɪ daʊn/$q$,
  $q$weigh down /weɪ daʊn/ 2$q$,
  $q$wind down /waɪnd daʊn/ 2$q$,
  $q$wind down /waɪnd daʊn/ 3$q$,
  $q$write off /raɪt ɒf/$q$,
  $q$six of one (and) half a dozen of the other$q$,
  $q$the other day$q$,
  $q$once in a blue moon$q$,
  $q$step aside$q$,
  $q$smarten up$q$,
  $q$for the time being$q$,
  $q$lock up /lɒk ʌp/ 2$q$
);

-- Pre-check: expect 66
SELECT count(*) AS rows_to_update FROM public.default_vocabulary_base
WHERE word IN (
  $q$hang out /hæŋ aʊt/$q$,
  $q$hang out /hæŋ aʊt/ 2$q$,
  $q$head off /hed ɒf/$q$,
  $q$head off /hed ɒf/ 2$q$,
  $q$hit back /hɪt bæk/$q$,
  $q$hit back /hɪt bæk/ 2$q$,
  $q$laze around /leɪz əˈraʊnd/$q$,
  $q$let on /let ɒn/$q$,
  $q$lie ahead /laɪ əˈhed/$q$,
  $q$liven up /ˈlaɪvn ʌp/$q$,
  $q$liven up /ˈlaɪvn ʌp/ 2$q$,
  $q$hit upon /hɪt əˈpɒn/$q$,
  $q$hit upon /hɪt əˈpɒn/ 2$q$,
  $q$key in /kiː ɪn/$q$,
  $q$kick off (with) /kɪk ɒf (/wɪð/)$q$,
  $q$knock off /nɒk ɒf/$q$,
  $q$make into /meɪk ˈɪntuː/$q$,
  $q$make out /meɪk aʊt/$q$,
  $q$make over /meɪk ˈəʊvər/$q$,
  $q$make up /meɪk ʌp/$q$,
  $q$meet up /miːt ʌp/$q$,
  $q$mess about/around /mes əˈbaʊt əˈraʊnd/$q$,
  $q$step aside /step əˈsaɪd/$q$,
  $q$stop off /stɒp ɒf/$q$,
  $q$store up /stɔːr ʌp/$q$,
  $q$store up /stɔːr ʌp/ 2$q$,
  $q$summon up /ˈsʌmən ʌp/$q$,
  $q$take after /teɪk ˈɑːftər/$q$,
  $q$take apart /teɪk əˈpɑːt/$q$,
  $q$take away /teɪk əˈweɪ/$q$,
  $q$take down /teɪk daʊn/$q$,
  $q$take in /teɪk ɪn/$q$,
  $q$take in /teɪk ɪn/ 2$q$,
  $q$take in /teɪk ɪn/ 3$q$,
  $q$take on /teɪk ɒn/$q$,
  $q$take to /teɪk tə/ 2$q$,
  $q$test out /test aʊt/$q$,
  $q$think over /θɪŋk ˈəʊvər/$q$,
  $q$think up /θɪŋk ʌp/$q$,
  $q$throw out /θrəʊ aʊt/$q$,
  $q$throw up /θrəʊ ʌp/$q$,
  $q$throw up /θrəʊ ʌp/ 2$q$,
  $q$tip up /tɪp ʌp/ 2$q$,
  $q$turn into /tɜːn ˈɪntuː/$q$,
  $q$walk out /wɔːk aʊt/$q$,
  $q$walk out /wɔːk aʊt/ 2$q$,
  $q$ward off /wɔːd ɒf/$q$,
  $q$warm up /wɔːm ʌp/$q$,
  $q$waste away /weɪst ə weɪ/$q$,
  $q$water down /ˈwɔːtə daʊn/$q$,
  $q$water down /ˈwɔːtə daʊn/ 2$q$,
  $q$wear down /weə daʊn/$q$,
  $q$wear down /weə daʊn/ 2$q$,
  $q$wear out /weə aʊt/$q$,
  $q$weigh down /weɪ daʊn/$q$,
  $q$weigh down /weɪ daʊn/ 2$q$,
  $q$wind down /waɪnd daʊn/ 2$q$,
  $q$wind down /waɪnd daʊn/ 3$q$,
  $q$write off /raɪt ɒf/$q$,
  $q$six of one (and) half a dozen of the other$q$,
  $q$the other day$q$,
  $q$once in a blue moon$q$,
  $q$step aside$q$,
  $q$smarten up$q$,
  $q$for the time being$q$,
  $q$lock up /lɒk ʌp/ 2$q$
);

UPDATE public.default_vocabulary_base SET example = $q$The lighthouse keeper hung out of the narrow window, squinting at the approaching storm.$q$ WHERE word = $q$hang out /hæŋ aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Most evenings, the interns hang out at a rooftop café near the harbour.$q$ WHERE word = $q$hang out /hæŋ aʊt/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Two security guards sprinted across the lot to head off the runaway courier.$q$ WHERE word = $q$head off /hed ɒf/$q$;
UPDATE public.default_vocabulary_base SET example = $q$A quick apology from the manager headed off what could have become a nasty strike.$q$ WHERE word = $q$head off /hed ɒf/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Rather than sulk, the novelist hit back with a witty column mocking her critics.$q$ WHERE word = $q$hit back /hɪt bæk/$q$;
UPDATE public.default_vocabulary_base SET example = $q$After months of bullying, the smaller boxer finally hit back with a stunning left hook.$q$ WHERE word = $q$hit back /hɪt bæk/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$We lazed around the cabin all weekend, reading old paperbacks and ignoring our phones.$q$ WHERE word = $q$laze around /leɪz əˈraʊnd/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Nobody let on that the surprise party had been planned for weeks.$q$ WHERE word = $q$let on /let ɒn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Difficult negotiations lie ahead, but the delegation seems cautiously confident about the coming months.$q$ WHERE word = $q$lie ahead /laɪ əˈhed/$q$;
UPDATE public.default_vocabulary_base SET example = $q$A scattering of toasted pine nuts will liven up an otherwise bland lentil salad.$q$ WHERE word = $q$liven up /ˈlaɪvn ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The new quiz host really livened up what used to be a sleepy Thursday night.$q$ WHERE word = $q$liven up /ˈlaɪvn ʌp/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Digging in her grandmother's garden, Mei hit upon a tin box of forgotten letters.$q$ WHERE word = $q$hit upon /hɪt əˈpɒn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$After weeks of brainstorming, the team hit upon a clever way to cut shipping costs.$q$ WHERE word = $q$hit upon /hɪt əˈpɒn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Please key in your reference number carefully before pressing the green confirmation button.$q$ WHERE word = $q$key in /kiː ɪn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The festival kicked off with a thunderous drum procession through the old market square.$q$ WHERE word = $q$kick off (with) /kɪk ɒf (/wɪð/)$q$;
UPDATE public.default_vocabulary_base SET example = $q$The builders knock off at four on Fridays, so call before then.$q$ WHERE word = $q$knock off /nɒk ɒf/$q$;
UPDATE public.default_vocabulary_base SET example = $q$She plans to make the abandoned grain silo into a climbing gym.$q$ WHERE word = $q$make into /meɪk ˈɪntuː/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Through the thick fog, I could barely make out the outline of the ferry.$q$ WHERE word = $q$make out /meɪk aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The charity hopes volunteers can make over the shabby youth centre in a single weekend.$q$ WHERE word = $q$make over /meɪk ˈəʊvər/$q$;
UPDATE public.default_vocabulary_base SET example = $q$I'll stay late tomorrow to make up the hours I missed attending the funeral.$q$ WHERE word = $q$make up /meɪk ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Let's meet up after the seminar and compare notes over some noodles.$q$ WHERE word = $q$meet up /miːt ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Stop messing about with the projector and help me carry these chairs.$q$ WHERE word = $q$mess about/around /mes əˈbaʊt əˈraʊnd/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The crowd murmured as the guard asked everyone to step aside for the ambulance.$q$ WHERE word = $q$step aside /step əˈsaɪd/$q$;
UPDATE public.default_vocabulary_base SET example = $q$We decided to stop off at a quiet lakeside village for an hour before driving north.$q$ WHERE word = $q$stop off /stɒp ɒf/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Ignoring your tax paperwork now is only storing up trouble for next spring.$q$ WHERE word = $q$store up /stɔːr ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Squirrels spend the autumn storing up acorns in hollow trunks to survive the winter.$q$ WHERE word = $q$store up /stɔːr ʌp/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$It took all her nerve to summon up the courage to confront her landlord.$q$ WHERE word = $q$summon up /ˈsʌmən ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Everyone says Tomas takes after his aunt, right down to her booming laugh.$q$ WHERE word = $q$take after /teɪk ˈɑːftər/$q$;
UPDATE public.default_vocabulary_base SET example = $q$He took the broken radio apart on the kitchen table, laying each screw in a saucer.$q$ WHERE word = $q$take apart /teɪk əˈpɑːt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The waiter agreed to take away the cost of the broken glass from our final bill.$q$ WHERE word = $q$take away /teɪk əˈweɪ/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Crews spent three days taking down the enormous scaffolding around the cathedral spire.$q$ WHERE word = $q$take down /teɪk daʊn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The clerk calmly took in the witness's statement, noting every date and name she mentioned.$q$ WHERE word = $q$take in /teɪk ɪn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Months after the accident, he still couldn't take in that his old friend was gone.$q$ WHERE word = $q$take in /teɪk ɪn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$The guided tour takes in three medieval castles and a famous vineyard.$q$ WHERE word = $q$take in /teɪk ɪn/ 3$q$;
UPDATE public.default_vocabulary_base SET example = $q$She agreed to take on the mentoring programme despite her already crowded schedule.$q$ WHERE word = $q$take on /teɪk ɒn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$After retiring, my uncle took to rising at dawn and walking along the canal.$q$ WHERE word = $q$take to /teɪk tə/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$We're testing out the prototype water filter on a small village well this month.$q$ WHERE word = $q$test out /test aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Think over the contract terms tonight, and give me your answer by morning.$q$ WHERE word = $q$think over /θɪŋk ˈəʊvər/$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to come up with a new idea, plan, story or reason using your mind$q$, example = $q$He always thought up elaborate stories to explain why his homework was missing.$q$ WHERE word = $q$think up /θɪŋk ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The landlord threw out the noisy tenants after a third warning about the parties.$q$ WHERE word = $q$throw out /θrəʊ aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The heavy surf kept throwing up fine spray that drifted across the empty promenade.$q$ WHERE word = $q$throw up /θrəʊ ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The audit threw up several surprising discrepancies that nobody in accounts had spotted.$q$ WHERE word = $q$throw up /θrəʊ ʌp/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Tip up the jar and tap the bottom until the last raisins fall out.$q$ WHERE word = $q$tip up /tɪp ʌp/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$By midnight the gentle drizzle had turned into a howling storm over the bay.$q$ WHERE word = $q$turn into /tɜːn ˈɪntuː/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Several delegates walked out of the speech, disgusted by the minister's smug remarks.$q$ WHERE word = $q$walk out /wɔːk aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Without warning, her business partner walked out, leaving her with the debts and a half-built shop.$q$ WHERE word = $q$walk out /wɔːk aʊt/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$She drinks ginger tea every winter morning to ward off colds.$q$ WHERE word = $q$ward off /wɔːd ɒf/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The sprinters jogged lightly and stretched to warm up before the cold morning race.$q$ WHERE word = $q$warm up /wɔːm ʌp/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Without proper care, the abandoned stray cat slowly wasted away behind the warehouse.$q$ WHERE word = $q$waste away /weɪst ə weɪ/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The bartender watered down the cheap whisky before serving it to the rowdy crowd.$q$ WHERE word = $q$water down /ˈwɔːtə daʊn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Lobbyists managed to water down the bill until it barely threatened anyone's profits.$q$ WHERE word = $q$water down /ˈwɔːtə daʊn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$Constant late-night calls gradually wore down her patience and her faith in the firm.$q$ WHERE word = $q$wear down /weə daʊn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Decades of foot traffic have worn down the marble steps into shallow dips.$q$ WHERE word = $q$wear down /weə daʊn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$After years of constant use, the old keyboard had worn out and several keys stopped working.$q$ WHERE word = $q$wear out /weə aʊt/$q$;
UPDATE public.default_vocabulary_base SET example = $q$Guilt about the unpaid loan weighed him down for months.$q$ WHERE word = $q$weigh down /weɪ daʊn/$q$;
UPDATE public.default_vocabulary_base SET example = $q$The fisherman's soaked coat weighed him down as he waded through the shallows.$q$ WHERE word = $q$weigh down /weɪ daʊn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$The family decided to wind down the bakery gradually over the next two years.$q$ WHERE word = $q$wind down /waɪnd daʊn/ 2$q$;
UPDATE public.default_vocabulary_base SET example = $q$A long bath and some quiet piano music help me wind down after shifts.$q$ WHERE word = $q$wind down /waɪnd daʊn/ 3$q$;
UPDATE public.default_vocabulary_base SET example = $q$The hire car was written off after it skidded into a concrete barrier.$q$ WHERE word = $q$write off /raɪt ɒf/$q$;
UPDATE public.default_vocabulary_base SET example = $q$"Should we take the early train or the late one?" "Honestly, it's six of one, half a dozen of the other."$q$ WHERE word = $q$six of one (and) half a dozen of the other$q$;
UPDATE public.default_vocabulary_base SET example = $q$I bumped into my old chemistry teacher at the market the other day.$q$ WHERE word = $q$the other day$q$;
UPDATE public.default_vocabulary_base SET example = $q$My brother cooks dinner once in a blue moon, usually when he's feeling guilty.$q$ WHERE word = $q$once in a blue moon$q$;
UPDATE public.default_vocabulary_base SET example = $q$The founder will step aside in June, handing the company to her longtime deputy.$q$ WHERE word = $q$step aside$q$;
UPDATE public.default_vocabulary_base SET example = $q$We repainted the shutters to smarten up the faded front of the guesthouse.$q$ WHERE word = $q$smarten up$q$;
UPDATE public.default_vocabulary_base SET example = $q$My laptop is being repaired, so I'm using my sister's old one for the time being.$q$ WHERE word = $q$for the time being$q$;
UPDATE public.default_vocabulary_base SET example = $q$After the trial, the judge decided to lock him up for five years.$q$ WHERE word = $q$lock up /lɒk ʌp/ 2$q$;

-- Post-check: expect 66
SELECT count(*) AS rows_updated FROM public.default_vocabulary_base
WHERE (word = $q$hang out /hæŋ aʊt/$q$ AND example = $q$The lighthouse keeper hung out of the narrow window, squinting at the approaching storm.$q$) OR (word = $q$hang out /hæŋ aʊt/ 2$q$ AND example = $q$Most evenings, the interns hang out at a rooftop café near the harbour.$q$) OR (word = $q$head off /hed ɒf/$q$ AND example = $q$Two security guards sprinted across the lot to head off the runaway courier.$q$) OR (word = $q$head off /hed ɒf/ 2$q$ AND example = $q$A quick apology from the manager headed off what could have become a nasty strike.$q$) OR (word = $q$hit back /hɪt bæk/$q$ AND example = $q$Rather than sulk, the novelist hit back with a witty column mocking her critics.$q$) OR (word = $q$hit back /hɪt bæk/ 2$q$ AND example = $q$After months of bullying, the smaller boxer finally hit back with a stunning left hook.$q$) OR (word = $q$laze around /leɪz əˈraʊnd/$q$ AND example = $q$We lazed around the cabin all weekend, reading old paperbacks and ignoring our phones.$q$) OR (word = $q$let on /let ɒn/$q$ AND example = $q$Nobody let on that the surprise party had been planned for weeks.$q$) OR (word = $q$lie ahead /laɪ əˈhed/$q$ AND example = $q$Difficult negotiations lie ahead, but the delegation seems cautiously confident about the coming months.$q$) OR (word = $q$liven up /ˈlaɪvn ʌp/$q$ AND example = $q$A scattering of toasted pine nuts will liven up an otherwise bland lentil salad.$q$) OR (word = $q$liven up /ˈlaɪvn ʌp/ 2$q$ AND example = $q$The new quiz host really livened up what used to be a sleepy Thursday night.$q$) OR (word = $q$hit upon /hɪt əˈpɒn/$q$ AND example = $q$Digging in her grandmother's garden, Mei hit upon a tin box of forgotten letters.$q$) OR (word = $q$hit upon /hɪt əˈpɒn/ 2$q$ AND example = $q$After weeks of brainstorming, the team hit upon a clever way to cut shipping costs.$q$) OR (word = $q$key in /kiː ɪn/$q$ AND example = $q$Please key in your reference number carefully before pressing the green confirmation button.$q$) OR (word = $q$kick off (with) /kɪk ɒf (/wɪð/)$q$ AND example = $q$The festival kicked off with a thunderous drum procession through the old market square.$q$) OR (word = $q$knock off /nɒk ɒf/$q$ AND example = $q$The builders knock off at four on Fridays, so call before then.$q$) OR (word = $q$make into /meɪk ˈɪntuː/$q$ AND example = $q$She plans to make the abandoned grain silo into a climbing gym.$q$) OR (word = $q$make out /meɪk aʊt/$q$ AND example = $q$Through the thick fog, I could barely make out the outline of the ferry.$q$) OR (word = $q$make over /meɪk ˈəʊvər/$q$ AND example = $q$The charity hopes volunteers can make over the shabby youth centre in a single weekend.$q$) OR (word = $q$make up /meɪk ʌp/$q$ AND example = $q$I'll stay late tomorrow to make up the hours I missed attending the funeral.$q$) OR (word = $q$meet up /miːt ʌp/$q$ AND example = $q$Let's meet up after the seminar and compare notes over some noodles.$q$) OR (word = $q$mess about/around /mes əˈbaʊt əˈraʊnd/$q$ AND example = $q$Stop messing about with the projector and help me carry these chairs.$q$) OR (word = $q$step aside /step əˈsaɪd/$q$ AND example = $q$The crowd murmured as the guard asked everyone to step aside for the ambulance.$q$) OR (word = $q$stop off /stɒp ɒf/$q$ AND example = $q$We decided to stop off at a quiet lakeside village for an hour before driving north.$q$) OR (word = $q$store up /stɔːr ʌp/$q$ AND example = $q$Ignoring your tax paperwork now is only storing up trouble for next spring.$q$) OR (word = $q$store up /stɔːr ʌp/ 2$q$ AND example = $q$Squirrels spend the autumn storing up acorns in hollow trunks to survive the winter.$q$) OR (word = $q$summon up /ˈsʌmən ʌp/$q$ AND example = $q$It took all her nerve to summon up the courage to confront her landlord.$q$) OR (word = $q$take after /teɪk ˈɑːftər/$q$ AND example = $q$Everyone says Tomas takes after his aunt, right down to her booming laugh.$q$) OR (word = $q$take apart /teɪk əˈpɑːt/$q$ AND example = $q$He took the broken radio apart on the kitchen table, laying each screw in a saucer.$q$) OR (word = $q$take away /teɪk əˈweɪ/$q$ AND example = $q$The waiter agreed to take away the cost of the broken glass from our final bill.$q$) OR (word = $q$take down /teɪk daʊn/$q$ AND example = $q$Crews spent three days taking down the enormous scaffolding around the cathedral spire.$q$) OR (word = $q$take in /teɪk ɪn/$q$ AND example = $q$The clerk calmly took in the witness's statement, noting every date and name she mentioned.$q$) OR (word = $q$take in /teɪk ɪn/ 2$q$ AND example = $q$Months after the accident, he still couldn't take in that his old friend was gone.$q$) OR (word = $q$take in /teɪk ɪn/ 3$q$ AND example = $q$The guided tour takes in three medieval castles and a famous vineyard.$q$) OR (word = $q$take on /teɪk ɒn/$q$ AND example = $q$She agreed to take on the mentoring programme despite her already crowded schedule.$q$) OR (word = $q$take to /teɪk tə/ 2$q$ AND example = $q$After retiring, my uncle took to rising at dawn and walking along the canal.$q$) OR (word = $q$test out /test aʊt/$q$ AND example = $q$We're testing out the prototype water filter on a small village well this month.$q$) OR (word = $q$think over /θɪŋk ˈəʊvər/$q$ AND example = $q$Think over the contract terms tonight, and give me your answer by morning.$q$) OR (word = $q$think up /θɪŋk ʌp/$q$ AND example = $q$He always thought up elaborate stories to explain why his homework was missing.$q$) OR (word = $q$throw out /θrəʊ aʊt/$q$ AND example = $q$The landlord threw out the noisy tenants after a third warning about the parties.$q$) OR (word = $q$throw up /θrəʊ ʌp/$q$ AND example = $q$The heavy surf kept throwing up fine spray that drifted across the empty promenade.$q$) OR (word = $q$throw up /θrəʊ ʌp/ 2$q$ AND example = $q$The audit threw up several surprising discrepancies that nobody in accounts had spotted.$q$) OR (word = $q$tip up /tɪp ʌp/ 2$q$ AND example = $q$Tip up the jar and tap the bottom until the last raisins fall out.$q$) OR (word = $q$turn into /tɜːn ˈɪntuː/$q$ AND example = $q$By midnight the gentle drizzle had turned into a howling storm over the bay.$q$) OR (word = $q$walk out /wɔːk aʊt/$q$ AND example = $q$Several delegates walked out of the speech, disgusted by the minister's smug remarks.$q$) OR (word = $q$walk out /wɔːk aʊt/ 2$q$ AND example = $q$Without warning, her business partner walked out, leaving her with the debts and a half-built shop.$q$) OR (word = $q$ward off /wɔːd ɒf/$q$ AND example = $q$She drinks ginger tea every winter morning to ward off colds.$q$) OR (word = $q$warm up /wɔːm ʌp/$q$ AND example = $q$The sprinters jogged lightly and stretched to warm up before the cold morning race.$q$) OR (word = $q$waste away /weɪst ə weɪ/$q$ AND example = $q$Without proper care, the abandoned stray cat slowly wasted away behind the warehouse.$q$) OR (word = $q$water down /ˈwɔːtə daʊn/$q$ AND example = $q$The bartender watered down the cheap whisky before serving it to the rowdy crowd.$q$) OR (word = $q$water down /ˈwɔːtə daʊn/ 2$q$ AND example = $q$Lobbyists managed to water down the bill until it barely threatened anyone's profits.$q$) OR (word = $q$wear down /weə daʊn/$q$ AND example = $q$Constant late-night calls gradually wore down her patience and her faith in the firm.$q$) OR (word = $q$wear down /weə daʊn/ 2$q$ AND example = $q$Decades of foot traffic have worn down the marble steps into shallow dips.$q$) OR (word = $q$wear out /weə aʊt/$q$ AND example = $q$After years of constant use, the old keyboard had worn out and several keys stopped working.$q$) OR (word = $q$weigh down /weɪ daʊn/$q$ AND example = $q$Guilt about the unpaid loan weighed him down for months.$q$) OR (word = $q$weigh down /weɪ daʊn/ 2$q$ AND example = $q$The fisherman's soaked coat weighed him down as he waded through the shallows.$q$) OR (word = $q$wind down /waɪnd daʊn/ 2$q$ AND example = $q$The family decided to wind down the bakery gradually over the next two years.$q$) OR (word = $q$wind down /waɪnd daʊn/ 3$q$ AND example = $q$A long bath and some quiet piano music help me wind down after shifts.$q$) OR (word = $q$write off /raɪt ɒf/$q$ AND example = $q$The hire car was written off after it skidded into a concrete barrier.$q$) OR (word = $q$six of one (and) half a dozen of the other$q$ AND example = $q$"Should we take the early train or the late one?" "Honestly, it's six of one, half a dozen of the other."$q$) OR (word = $q$the other day$q$ AND example = $q$I bumped into my old chemistry teacher at the market the other day.$q$) OR (word = $q$once in a blue moon$q$ AND example = $q$My brother cooks dinner once in a blue moon, usually when he's feeling guilty.$q$) OR (word = $q$step aside$q$ AND example = $q$The founder will step aside in June, handing the company to her longtime deputy.$q$) OR (word = $q$smarten up$q$ AND example = $q$We repainted the shutters to smarten up the faded front of the guesthouse.$q$) OR (word = $q$for the time being$q$ AND example = $q$My laptop is being repaired, so I'm using my sister's old one for the time being.$q$) OR (word = $q$lock up /lɒk ʌp/ 2$q$ AND example = $q$After the trial, the judge decided to lock him up for five years.$q$);

COMMIT;

-- ROLLBACK (manual; run only if needed)
-- BEGIN;
-- UPDATE public.default_vocabulary_base d
--    SET example = b.example, meaning = b.meaning
--   FROM public.default_vocabulary_base_bak_20261116_phrasal b
--  WHERE d.word = b.word;
-- COMMIT;
-- DROP TABLE public.default_vocabulary_base_bak_20261116_phrasal;  -- after confirming
