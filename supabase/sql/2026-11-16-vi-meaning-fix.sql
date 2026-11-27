-- 2026-11-16 fix rows whose English "meaning" was written in Vietnamese
-- Purpose: for 454 rows in public.default_vocabulary_base, replace the Vietnamese
--   "meaning" with an English definition and move the Vietnamese gloss into "translation"
--   (merged with the existing Vietnamese example translations). Mirrors the change made to
--   12 entries in src/data/defaultVocabulary.json. Only meaning and translation are updated.
-- STATUS: APPLIED to project vijvcojvemkzgpzpowzh on 2026-11-16 (order: backups, A, B, phrasal, vi-meaning, take-down, C, D)
-- Independent of the category-normalisation section C in 2026-11-16-default-vocab-cleanup.sql
--   (it is safe to run before it, or after it).
-- Roll back: restore meaning/translation from public.default_vocabulary_base_bak_20261116_vimeaning
--   using the commented block at the bottom (run it in its own transaction), then drop the backup.

BEGIN;

CREATE TABLE IF NOT EXISTS public.default_vocabulary_base_bak_20261116_vimeaning AS
SELECT * FROM public.default_vocabulary_base
WHERE word IN (
  $q$a 50-mile / ten-mile / 1km radius$q$,
  $q$a bar chart compares something$q$,
  $q$a bar chart shows / illustrates something$q$,
  $q$a basic / abstract / key concept$q$,
  $q$a chain reaction of events$q$,
  $q$a chamber / symphony orchestra$q$,
  $q$a chest / ear / lung infection$q$,
  $q$a co-operative approach / effort / relationship$q$,
  $q$a commuter town / belt$q$,
  $q$a commuter train / bus$q$,
  $q$a compelling argument / reason$q$,
  $q$a conceptual / theoretical framework$q$,
  $q$a condition / situation deteriorates$q$,
  $q$a congestion charge$q$,
  $q$a consistent player / performer$q$,
  $q$a contributing factor$q$,
  $q$a corrupt / opposition politician$q$,
  $q$a current affairs programme$q$,
  $q$a current of air / electricity$q$,
  $q$a debate on / over / about something$q$,
  $q$a decade later / ago$q$,
  $q$a definitive answer / conclusion$q$,
  $q$a devastating / flash flood$q$,
  $q$a devastating / powerful hurricane$q$,
  $q$a diagram illustrates / shows something$q$,
  $q$a different / new / fresh perspective$q$,
  $q$a distinct category / type / species$q$,
  $q$a diverse group / population$q$,
  $q$a doctor / specialist examines someone$q$,
  $q$a drama is based on something$q$,
  $q$a drama is set / filmed somewhere$q$,
  $q$a drama unfolds / begins$q$,
  $q$a fast-growing / profitable segment$q$,
  $q$a fatal / deadly / chronic disease$q$,
  $q$a final / ultimate destination$q$,
  $q$a firm's client$q$,
  $q$a first-generation / second-generation immigrant$q$,
  $q$a flawed assumption / premise$q$,
  $q$a flexible approach / system / arrangement$q$,
  $q$a flexible rate / market$q$,
  $q$a flood hits / sweeps somewhere$q$,
  $q$a food / peanut / skin allergy$q$,
  $q$a foster / adoptive / birth parent$q$,
  $q$a glacier melts / retreats$q$,
  $q$a historic agreement / decision / victory$q$,
  $q$a historic event / occasion / moment$q$,
  $q$a hurricane hits / destroys somewhere$q$,
  $q$a leading / senior / prominent politician$q$,
  $q$a legal / regulatory / political framework$q$,
  $q$a likely outcome / candidate$q$,
  $q$a lively / intense / ongoing debate$q$,
  $q$a long-term / chronic / serious addiction$q$,
  $q$a main / direct / scenic route$q$,
  $q$a major / good / bad influence$q$,
  $q$a marked contrast / improvement / increase$q$,
  $q$a minor / severe / fatal stroke$q$,
  $q$a model of efficiency / excellence$q$,
  $q$a modern / cultural equivalent$q$,
  $q$a moral / ethical dilemma$q$,
  $q$a negligible amount / risk / cost$q$,
  $q$a negligible impact / effect / contribution$q$,
  $q$a neutral / tough / moral stance$q$,
  $q$a new / next millennium$q$,
  $q$a null / testable / alternative hypothesis$q$,
  $q$a painting / photograph depicts something$q$,
  $q$a pie chart shows / displays something$q$,
  $q$a pioneering technique / concept$q$,
  $q$a pivotal role / moment / figure$q$,
  $q$a political / religious / economic ideology$q$,
  $q$a powerful / deadly typhoon$q$,
  $q$a problem stems from a fact / misconception$q$,
  $q$a profound change / impact / effect / influence$q$,
  $q$a profound sense of something$q$,
  $q$a prolonged / severe / devastating drought$q$,
  $q$a prospective client$q$,
  $q$a report / rule states something$q$,
  $q$a residential / run-down neighbourhood$q$,
  $q$a rural area / community / population$q$,
  $q$a rural economy / road$q$,
  $q$a safe / good / quiet neighbourhood$q$,
  $q$a scientific / broad / general consensus$q$,
  $q$a scientific / evolutionary theory$q$,
  $q$a segment of something$q$,
  $q$a serious / real / major / great challenge$q$,
  $q$a severe / common / life-threatening allergy$q$,
  $q$a significant / profound / lasting impact$q$,
  $q$a simple / complex / schematic diagram$q$,
  $q$a single / lone parent$q$,
  $q$a skilled / illegal immigrant$q$,
  $q$a sociology professor / lecturer / student$q$,
  $q$a stage of a cycle / process$q$,
  $q$a stage of development / evolution$q$,
  $q$a stroke victim / patient / unit$q$,
  $q$a strong / ocean current$q$,
  $q$a subsequent investigation / enquiry$q$,
  $q$a subsequent year / event / generation$q$,
  $q$a successful / likely outcome$q$,
  $q$a tentative conclusion / theory$q$,
  $q$a tentative step / agreement / deal$q$,
  $q$a theory of something$q$,
  $q$a tolerant society / country / attitude$q$,
  $q$a tourist / holiday / popular / favourite destination$q$,
  $q$a trade / escape / supply route$q$,
  $q$a valid reason / point / argument$q$,
  $q$a valuable asset / lesson / resource / experience$q$,
  $q$a valuable contribution / item$q$,
  $q$a viral / bacterial / respiratory infection$q$,
  $q$a vulnerable position$q$,
  $q$a younger / elder sibling$q$,
  $q$abandon a project / plan / ship$q$,
  $q$abundant wildlife / evidence / resources$q$,
  $q$accompanied by a bodyguard / adult / escort$q$,
  $q$accompanied by someone$q$,
  $q$accurate information / figures$q$,
  $q$acknowledge the existence / importance of something$q$,
  $q$acknowledge the need for something$q$,
  $q$actively / urgently / desperately seek$q$,
  $q$addiction to something$q$,
  $q$address a problem / issue / concern$q$,
  $q$adjust figures / rates$q$,
  $q$adjust to something$q$,
  $q$administer a dose / injection / vaccine / drug$q$,
  $q$administer something to someone$q$,
  $q$adopt / take a stance on something$q$,
  $q$advise / represent a client$q$,
  $q$advocate reform / legislation$q$,
  $q$affect the outcome / quality / performance$q$,
  $q$allergy sufferers / symptoms$q$,
  $q$alter the course / outcome of something$q$,
  $q$ambiguous language / wording$q$,
  $q$an abandoned building / vehicle$q$,
  $q$an abundant supply of something$q$,
  $q$an accurate description / prediction$q$,
  $q$an addiction problem / clinic / counsellor$q$,
  $q$an allergy to something$q$,
  $q$an Antarctic / Alaskan glacier$q$,
  $q$an archaeology student / professor / department$q$,
  $q$an astronomy professor / enthusiast / mission$q$,
  $q$an autonomous individual$q$,
  $q$an autonomous region / republic / province$q$,
  $q$an economic / financial / humanitarian crisis$q$,
  $q$an economics professor / degree / department$q$,
  $q$an efficient manner$q$,
  $q$an efficient use of something$q$,
  $q$an efficient way of doing something$q$,
  $q$an estimated percentage / amount$q$,
  $q$an expanding universe / economy / population$q$,
  $q$an idealistic notion / vision / view$q$,
  $q$an identical copy / twin$q$,
  $q$an immigrant population / community / worker$q$,
  $q$an impact on the environment / economy$q$,
  $q$an initial reaction / response / impression$q$,
  $q$an opera singer / house$q$,
  $q$an overall impression / increase / majority$q$,
  $q$an urban neighbourhood / environment$q$,
  $q$analogous to something$q$,
  $q$analyse data / statistics / results / trends$q$,
  $q$analyse something critically / carefully$q$,
  $q$arrange things in a row$q$,
  $q$attend a meeting / conference / funeral$q$,
  $q$attend regularly / rarely$q$,
  $q$avoid / prevent / cause dehydration$q$,
  $q$badly / adversely / directly affect something$q$,
  $q$badly / severely / permanently damage something$q$,
  $q$be suspended / postponed indefinitely$q$,
  $q$biased against / in favour of someone$q$,
  $q$biased reporting / research$q$,
  $q$broadcast live$q$,
  $q$broadcast on television / radio$q$,
  $q$build / improve / destroy infrastructure$q$,
  $q$carefully evaluate something$q$,
  $q$cause / reduce / ease congestion$q$,
  $q$celebrate / approach / reach the millennium$q$,
  $q$childhood / adult obesity$q$,
  $q$choose / prefer the latter$q$,
  $q$claim falsely / rightly / wrongly$q$,
  $q$claim repeatedly$q$,
  $q$classical architecture / mythology$q$,
  $q$classical music / ballet$q$,
  $q$clear / strong / conclusive evidence$q$,
  $q$clearly / easily distinguish$q$,
  $q$clearly / most marked$q$,
  $q$clearly / narrowly / broadly defined$q$,
  $q$clinical / cognitive psychology$q$,
  $q$closely / strongly resemble something$q$,
  $q$closely observe$q$,
  $q$comparatively little / small$q$,
  $q$comparatively rare / inexpensive$q$,
  $q$compare something with / to something$q$,
  $q$compelling evidence / data$q$,
  $q$completely / dramatically transform something$q$,
  $q$conclusive / irrefutable / concrete proof$q$,
  $q$condense into rain / droplets$q$,
  $q$conduct an orchestra$q$,
  $q$consistent with a finding / hypothesis$q$,
  $q$consistent with something$q$,
  $q$continue indefinitely$q$,
  $q$contract / transmit / spread an infection$q$,
  $q$contract rhythmically / rapidly$q$,
  $q$contrast sharply / starkly$q$,
  $q$contrast with something$q$,
  $q$contribute greatly / significantly$q$,
  $q$contribute to something$q$,
  $q$conventional forces / weapons$q$,
  $q$conventional treatment / methods$q$,
  $q$conventional wisdom / thinking$q$,
  $q$convey a message$q$,
  $q$convey a sense / impression of something$q$,
  $q$convey something vividly / powerfully / accurately$q$,
  $q$cure / treat / overcome / fight an addiction$q$,
  $q$damage someone's reputation / credibility$q$,
  $q$damage the environment$q$,
  $q$data / findings suggest something$q$,
  $q$decades of war / conflict / neglect$q$,
  $q$decline from x to y / by x$q$,
  $q$define a term / concept$q$,
  $q$define something as / in terms of something$q$,
  $q$definitive proof$q$,
  $q$delay the onset / start of something$q$,
  $q$deliberately / highly ambiguous$q$,
  $q$determine the cause / extent of something$q$,
  $q$determine the outcome / future$q$,
  $q$develop / diagnose / trigger an allergy$q$,
  $q$develop / propose / formulate a theory$q$,
  $q$develop a technique / strategy / idea$q$,
  $q$develop into something$q$,
  $q$diagnosed with a disorder / disease / tumour$q$,
  $q$diagnosed with cancer / diabetes / leukaemia$q$,
  $q$differ from something$q$,
  $q$differ significantly / markedly$q$,
  $q$differentiate between things$q$,
  $q$differentiate something from something$q$,
  $q$difficult / impossible to predict$q$,
  $q$diminish in importance / size / number$q$,
  $q$dispute a claim / assertion / allegation$q$,
  $q$distinct from something$q$,
  $q$distinguish between things$q$,
  $q$drought affects / hits somewhere$q$,
  $q$drug / nicotine / alcohol addiction$q$,
  $q$educational / evolutionary psychology$q$,
  $q$embrace / reject an ideology$q$,
  $q$encounter a difficulty / problem$q$,
  $q$encounter resistance / opposition$q$,
  $q$entirely / amply justified$q$,
  $q$entirely / fairly / broadly consistent$q$,
  $q$eradicate disease / poverty / illiteracy$q$,
  $q$especially / highly / increasingly vulnerable$q$,
  $q$establish a link / relationship$q$,
  $q$estimate cost / value / revenue$q$,
  $q$estimate something at x$q$,
  $q$ethnically / culturally diverse$q$,
  $q$evacuate / warn / advise residents$q$,
  $q$evaluate a situation / impact / risk$q$,
  $q$evaluate the effectiveness of something$q$,
  $q$evidence / research suggests$q$,
  $q$evidence of / for something$q$,
  $q$evolve from / into something$q$,
  $q$exacerbate a problem / situation / conflict$q$,
  $q$exacerbate tensions / symptoms$q$,
  $q$examine a patient$q$,
  $q$examine someone carefully$q$,
  $q$expand capacity / production$q$,
  $q$expand rapidly / dramatically$q$,
  $q$fiercely / relatively / largely autonomous$q$,
  $q$find / gather / collect evidence$q$,
  $q$firmly / quickly establish something$q$,
  $q$flawed logic / reasoning$q$,
  $q$flexible working / working hours$q$,
  $q$flow freely / steadily / constantly$q$,
  $q$free-market / development economics$q$,
  $q$from the perspective of someone$q$,
  $q$fuel / energy efficient$q$,
  $q$fully vaccinated$q$,
  $q$generate excitement / publicity / controversy$q$,
  $q$generate income / electricity / power$q$,
  $q$genetically / chemically modified$q$,
  $q$gradually / considerably diminished$q$,
  $q$have / exert influence on someone$q$,
  $q$have / fear repercussions$q$,
  $q$have drawbacks$q$,
  $q$health / economic / social benefit$q$,
  $q$heart / lung / kidney disease$q$,
  $q$highly / extremely efficient$q$,
  $q$highly / increasingly likely$q$,
  $q$hotly / bitterly disputed$q$,
  $q$identical to / with something$q$,
  $q$increase / extend the width$q$,
  $q$increase / reduce volume$q$,
  $q$increase / rise / improve marginally$q$,
  $q$indigenous / native / local inhabitants$q$,
  $q$inevitably lead to / result in something$q$,
  $q$infection control / prevention$q$,
  $q$intense competition / rivalry$q$,
  $q$intense heat / pain / pressure / scrutiny$q$,
  $q$intervene in a dispute / conflict / crisis$q$,
  $q$intervene personally / directly$q$,
  $q$introduce / adopt / follow a model$q$,
  $q$investigate a link / case / complaint$q$,
  $q$justify a war / action / expense$q$,
  $q$Keynesian / classical / experimental economics$q$,
  $q$language / technology evolves$q$,
  $q$launch a campaign / an attack$q$,
  $q$launch a product / brand / book$q$,
  $q$likely to happen / cause / continue$q$,
  $q$local / permanent / elderly residents$q$,
  $q$look / sound / think alike$q$,
  $q$marginally higher / lower$q$,
  $q$maritime / industrial / classical archaeology$q$,
  $q$modern / historical / applied linguistics$q$,
  $q$morally / economically justified$q$,
  $q$object strongly$q$,
  $q$object to something$q$,
  $q$object to the idea / use of something$q$,
  $q$observe behaviour$q$,
  $q$of medium / normal / average height$q$,
  $q$openly / strongly / publicly advocate$q$,
  $q$orally / intravenously administered$q$,
  $q$organise a meeting / event / demonstration$q$,
  $q$organise things by group / topic$q$,
  $q$outweigh / overcome drawbacks$q$,
  $q$overall spending / revenue$q$,
  $q$overcome a problem / difficulty / obstacle$q$,
  $q$overcome an injury / deficit$q$,
  $q$participate equally / willingly / effectively$q$,
  $q$participate in a discussion / activity / debate$q$,
  $q$particularly useful / important / relevant$q$,
  $q$particularly vulnerable / concerned$q$,
  $q$peacefully / amicably resolve something$q$,
  $q$perfectly / equally valid$q$,
  $q$pioneering work / surgery / research$q$,
  $q$planetary / theoretical / modern astronomy$q$,
  $q$pose / face / solve a dilemma$q$,
  $q$predict a rise / decline / recovery$q$,
  $q$predict an event / outcome$q$,
  $q$present / pose / accept / face / meet a challenge$q$,
  $q$prevent / combat / treat an infection$q$,
  $q$prevent / treat / cure a disease$q$,
  $q$prior approval / permission / consent$q$,
  $q$prior knowledge / experience$q$,
  $q$proof of identity / residency$q$,
  $q$prove / become pivotal$q$,
  $q$prove / become valuable$q$,
  $q$provisionally agreed / accepted / scheduled$q$,
  $q$provoke a reaction / response / debate$q$,
  $q$provoke outrage / anger / controversy$q$,
  $q$question the validity / legality of something$q$,
  $q$question the wisdom / motives of someone$q$,
  $q$racially tolerant$q$,
  $q$radically / fundamentally alter something$q$,
  $q$rapidly / steadily deteriorate$q$,
  $q$reach / build / achieve a consensus$q$,
  $q$reach a height of x$q$,
  $q$reap the benefit of something$q$,
  $q$reasonably / factually accurate$q$,
  $q$recite / read / quote poetry$q$,
  $q$reinforce a perception / view / belief$q$,
  $q$reinforce a stereotype / message$q$,
  $q$relatively easy / cheap / recently$q$,
  $q$relatively small / low / short$q$,
  $q$represent a difference / increase / shift$q$,
  $q$resolve / face a crisis$q$,
  $q$resolve a dispute / conflict / issue$q$,
  $q$result from use / a failure / lack$q$,
  $q$result in a loss / increase / reduction$q$,
  $q$routinely / properly screen$q$,
  $q$screen for a disease / condition$q$,
  $q$screen someone for something$q$,
  $q$seasonally / automatically / manually adjusted$q$,
  $q$secure a victory / place / deal$q$,
  $q$secure funding / peace$q$,
  $q$secure the approval / support of someone$q$,
  $q$seek approval / permission / compensation$q$,
  $q$seek help / advice / refuge / treatment$q$,
  $q$serious / potential / negative repercussions$q$,
  $q$serious / severe / unintended consequences$q$,
  $q$severe / mild / extreme dehydration$q$,
  $q$shift one's weight / position$q$,
  $q$shift the focus / emphasis / balance$q$,
  $q$sibling rivalry 2$q$,
  $q$significantly / extensively modified$q$,
  $q$someone is diagnosed with something$q$,
  $q$something stretches / extends the length of something$q$,
  $q$spark / provoke / trigger a debate$q$,
  $q$state a fact / reason / preference$q$,
  $q$state clearly / explicitly$q$,
  $q$steadily / rapidly / sharply decline$q$,
  $q$stem from something$q$,
  $q$strongly / tentatively suggest$q$,
  $q$suffer / face / accept the consequences$q$,
  $q$suffer / have / prevent a stroke$q$,
  $q$suspended from a ceiling / hook$q$,
  $q$tackle / prevent / reduce obesity$q$,
  $q$tackle a problem / issue / task$q$,
  $q$tackle crime / corruption$q$,
  $q$take / follow / choose a route$q$,
  $q$temporarily / indefinitely suspend something$q$,
  $q$test / support / confirm a hypothesis$q$,
  $q$the benefit of something$q$,
  $q$the circumference of something$q$,
  $q$the concept of freedom / democracy / justice$q$,
  $q$the consequences of war / action / failure$q$,
  $q$the entire / full / overall length of something$q$,
  $q$the equivalent of something$q$,
  $q$the front / back row$q$,
  $q$the geology of somewhere$q$,
  $q$the geology of the area / region / island$q$,
  $q$the inhabitants of somewhere$q$,
  $q$the initial stages / results$q$,
  $q$the last / next decade$q$,
  $q$the latter stage / part / category$q$,
  $q$the length of something$q$,
  $q$the main / major drawback$q$,
  $q$the maximum / minimum height$q$,
  $q$the muscles / ventricles contract$q$,
  $q$the obesity epidemic / rate / problem$q$,
  $q$the outcome of something$q$,
  $q$the parents of someone$q$,
  $q$the sheer / huge / high volume$q$,
  $q$the sociology of religion / science$q$,
  $q$the volume of traffic / data$q$,
  $q$the width of something$q$,
  $q$thoroughly / properly investigate$q$,
  $q$tolerant of something$q$,
  $q$traffic / road congestion$q$,
  $q$transform a country / business / area$q$,
  $q$transmit / contract / develop a disease$q$,
  $q$transport / rail / security infrastructure$q$,
  $q$trigger / set off a chain reaction$q$,
  $q$trigger a crisis / war / debate$q$,
  $q$trigger a tsunami / landslide / avalanche$q$,
  $q$urban sprawl / renewal / planning$q$,
  $q$urgently / directly address something$q$,
  $q$vaccinated against measles / flu / rabies$q$,
  $q$vaccinated against something$q$,
  $q$vapour / moisture / steam condenses$q$,
  $q$vary considerably / widely$q$,
  $q$vary from region to region / person to person$q$,
  $q$virtually / completely eradicated$q$,
  $q$vividly / accurately depicted$q$,
  $q$vulnerable children / women / people$q$,
  $q$vulnerable to attack / damage / fire$q$,
  $q$vulnerable to something$q$,
  $q$water / blood flows$q$,
  $q$well / poorly organised$q$,
  $q$widely / universally acknowledged$q$,
  $q$within a radius of something$q$,
  $q$write / compose / publish poetry$q$,
  $q$energy /ˈenədʒi/$q$,
  $q$floor$q$,
  $q$mind /maɪnd/$q$,
  $q$opinion$q$,
  $q$quality$q$,
  $q$rapid$q$
);

-- Pre-check: expect 453
SELECT count(*) AS backed_up_rows FROM public.default_vocabulary_base_bak_20261116_vimeaning;

UPDATE public.default_vocabulary_base SET meaning = $q$the area within a given distance (50 miles, ten miles, 1km) around a central point$q$, translation = $q$bán kính 50 dặm / mười dặm / 1km
1) Cơn bão ảnh hưởng đến mọi thứ trong bán kính 50 dặm.
2) Người dân đến từ trong phạm vi bán kính mười dặm.
3) Tín hiệu phủ một bán kính 1km.$q$ WHERE word = $q$a 50-mile / ten-mile / 1km radius$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to show the differences between things, using a chart with bars$q$, translation = $q$biểu đồ cột so sánh điều gì
Biểu đồ cột so sánh mức chi tiêu ở ba quốc gia.$q$ WHERE word = $q$a bar chart compares something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a bar chart presents or gives a visual picture of information$q$, translation = $q$biểu đồ cột cho thấy / minh họa điều gì
1) Biểu đồ cột cho thấy doanh số trong năm năm.
2) Biểu đồ cột minh họa những thay đổi về dân số.$q$ WHERE word = $q$a bar chart shows / illustrates something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an idea that is fundamental, theoretical rather than concrete, or of central importance$q$, translation = $q$một khái niệm cơ bản / trừu tượng / then chốt
1) Học sinh phải nắm khái niệm cơ bản trước.
2) Thời gian là một khái niệm trừu tượng.
3) Đây là một khái niệm then chốt trong khóa học.$q$ WHERE word = $q$a basic / abstract / key concept$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a series of events in which each one causes the next$q$, translation = $q$một chuỗi phản ứng dây chuyền của các sự kiện
Vụ tai nạn đã gây ra một chuỗi sự kiện dây chuyền.$q$ WHERE word = $q$a chain reaction of events$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a small orchestra for a hall, or a large orchestra playing symphonies$q$, translation = $q$dàn nhạc thính phòng / giao hưởng
1) Một dàn nhạc thính phòng chơi trong khán phòng nhỏ.
2) Dàn nhạc giao hưởng biểu diễn Beethoven.$q$ WHERE word = $q$a chamber / symphony orchestra$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an illness caused by germs in the chest, ear or lungs$q$, translation = $q$nhiễm trùng ngực / tai / phổi
1) Một đợt nhiễm trùng ngực khiến anh ấy ho suốt nhiều tuần.
2) Trẻ em thường bị nhiễm trùng tai sau khi cảm lạnh.
3) Nhiễm trùng phổi có thể nghiêm trọng với người già.$q$ WHERE word = $q$a chest / ear / lung infection$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an approach, effort or relationship in which people or groups work together$q$, translation = $q$cách tiếp cận / nỗ lực / mối quan hệ hợp tác
1) Giải quyết biến đổi khí hậu cần một cách tiếp cận hợp tác giữa các quốc gia.
2) Dự án thành công nhờ một nỗ lực hợp tác.
3) Họ xây dựng mối quan hệ hợp tác qua nhiều năm.$q$ WHERE word = $q$a co-operative approach / effort / relationship$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a town, or an area around a city, where many residents travel to work in the city$q$, translation = $q$thị trấn / vành đai dân cư đi làm xa
1) Nhiều gia đình sống ở một thị trấn ngoại ô đi làm xa.
2) Giá nhà ở vành đai dân cư đi làm xa cứ tăng lên.$q$ WHERE word = $q$a commuter town / belt$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a train or bus used by people travelling regularly to and from work$q$, translation = $q$tàu / xe buýt dành cho người đi làm
1) Chuyến tàu dành cho người đi làm chật kín mỗi sáng.
2) Cô ấy đi xe buýt dành cho người đi làm vào thành phố.$q$ WHERE word = $q$a commuter train / bus$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an argument or reason that is strong and convincing$q$, translation = $q$một lập luận / lý do thuyết phục
1) Cô ấy đưa ra một lập luận thuyết phục cho sự thay đổi.
2) Có một lý do thuyết phục để hành động ngay.$q$ WHERE word = $q$a compelling argument / reason$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a structure of ideas or theories that underpins and guides a study or argument$q$, translation = $q$một khuôn khổ khái niệm / lý thuyết
1) Nghiên cứu sử dụng một khuôn khổ khái niệm rõ ràng.
2) Cô ấy xây dựng một khung lý thuyết cho nghiên cứu của mình.$q$ WHERE word = $q$a conceptual / theoretical framework$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to become worse, as a person's health or a state of affairs$q$, translation = $q$một tình trạng / tình hình xấu đi
1) Tình trạng của bệnh nhân xấu đi qua đêm.
2) Tình hình chính trị nhanh chóng xấu đi.$q$ WHERE word = $q$a condition / situation deteriorates$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a fee drivers pay to enter a busy city area, to reduce traffic$q$, translation = $q$phí tắc nghẽn (phí vào trung tâm)
London đã áp dụng phí tắc nghẽn để giảm giao thông.$q$ WHERE word = $q$a congestion charge$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a player or performer who reliably performs at a steady, good level$q$, translation = $q$một cầu thủ / người thể hiện ổn định
1) Anh ấy là một cầu thủ ổn định, hiếm khi chơi tệ.
2) Nhà đầu tư thích một bên thể hiện ổn định hơn là rủi ro.$q$ WHERE word = $q$a consistent player / performer$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$something that helps to bring about a result along with other causes$q$, translation = $q$một yếu tố góp phần
Căng thẳng là một yếu tố góp phần gây ra nhiều bệnh.$q$ WHERE word = $q$a contributing factor$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a politician who is dishonest, or one who belongs to a party opposing the government$q$, translation = $q$một chính trị gia tham nhũng / đối lập
1) Cử tri đã chán những chính trị gia tham nhũng.
2) Một chính trị gia đối lập chỉ trích ngân sách.$q$ WHERE word = $q$a corrupt / opposition politician$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a TV or radio programme discussing the latest news and political events$q$, translation = $q$Tôi xem một chương trình thời sự để cập nhật tin tức.$q$ WHERE word = $q$a current affairs programme$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a flow of air, or a flow of electric charge, in one direction$q$, translation = $q$một luồng không khí / dòng điện
1) Một luồng không khí lạnh tràn qua cửa sổ.
2) Một dòng điện chạy qua dây.$q$ WHERE word = $q$a current of air / electricity$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a discussion in which people express opposing views about a topic$q$, translation = $q$cuộc tranh luận về điều gì
1) Có một cuộc tranh luận gay gắt về chính sách khí hậu.
2) Cuộc tranh luận về nhập cư vẫn tiếp diễn.
3) Một cuộc tranh luận về giờ học chia rẽ các phụ huynh.$q$ WHERE word = $q$a debate on / over / about something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$ten years after, or before, a particular time$q$, translation = $q$một thập kỷ sau / trước
1) Một thập kỷ sau, khu vực này thay đổi đến không nhận ra.
2) Nhà máy đã đóng cửa một thập kỷ trước.$q$ WHERE word = $q$a decade later / ago$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a final, clear answer or conclusion that is certain and complete$q$, translation = $q$một câu trả lời / kết luận dứt khoát
1) Các nhà khoa học vẫn chưa thể đưa ra câu trả lời dứt khoát.
2) Nghiên cứu đã đi đến một kết luận dứt khoát.$q$ WHERE word = $q$a definitive answer / conclusion$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very destructive flood, or a sudden flood after heavy rain$q$, translation = $q$một trận lũ tàn khốc / lũ quét
1) Một trận lũ tàn khốc đã phá hủy hàng trăm ngôi nhà.
2) Một trận lũ quét tràn qua thung lũng chỉ trong vài phút.$q$ WHERE word = $q$a devastating / flash flood$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very destructive or strong tropical storm with violent winds$q$, translation = $q$một cơn bão tàn khốc / mạnh
1) Một cơn bão tàn khốc đã san phẳng thị trấn.
2) Một cơn bão mạnh đang tiến vào bờ biển.$q$ WHERE word = $q$a devastating / powerful hurricane$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a drawing explains or presents how something works or what it contains$q$, translation = $q$sơ đồ minh họa / cho thấy điều gì
1) Sơ đồ minh họa cách máy hoạt động.
2) Sơ đồ cho thấy các giai đoạn của quá trình.$q$ WHERE word = $q$a diagram illustrates / shows something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way of looking at something that differs from or adds to the usual view$q$, translation = $q$một góc nhìn khác / mới / mới mẻ
1) Du lịch cho bạn một góc nhìn khác về cuộc sống.
2) Cô ấy mang đến một góc nhìn mới cho cả đội.
3) Một góc nhìn mới mẻ có thể giải quyết những vấn đề cũ.$q$ WHERE word = $q$a different / new / fresh perspective$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a separate, clearly different category, type or species$q$, translation = $q$một loại / kiểu / loài riêng biệt
1) Những ngôn ngữ này tạo thành một nhóm riêng biệt.
2) Đó là một thể loại nhạc riêng biệt.$q$ WHERE word = $q$a distinct category / type / species$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a group or population made up of many different kinds of people$q$, translation = $q$một nhóm / dân cư đa dạng
1) Đội ngũ là một nhóm chuyên gia đa dạng.
2) Đất nước này có một dân cư rất đa dạng.$q$ WHERE word = $q$a diverse group / population$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a doctor or expert looks at someone's body to check their health$q$, translation = $q$bác sĩ / chuyên gia khám cho ai đó
1) Một bác sĩ khám cho bệnh nhân và yêu cầu xét nghiệm.
2) Một chuyên gia khám đầu gối của cô ấy trước khi phẫu thuật.$q$ WHERE word = $q$a doctor / specialist examines someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a film or TV drama that takes its story from real events or another work$q$, translation = $q$một bộ phim dựa trên điều gì
Bộ phim dựa trên một câu chuyện có thật.$q$ WHERE word = $q$a drama is based on something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a TV or film drama has its story located, or is recorded, in a place$q$, translation = $q$một bộ phim lấy bối cảnh / được quay ở đâu đó
1) Bộ phim lấy bối cảnh London thế kỷ XIX.
2) Bộ phim được quay ở New Zealand.$q$ WHERE word = $q$a drama is set / filmed somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a story or play develops or starts to be shown$q$, translation = $q$một bộ phim mở ra / bắt đầu
1) Câu chuyện mở ra qua ba thế hệ.
2) Bộ phim bắt đầu bằng một cuộc gọi bí ẩn.$q$ WHERE word = $q$a drama unfolds / begins$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a part of a market or business that is expanding quickly or makes money$q$, translation = $q$một phân khúc tăng trưởng nhanh / sinh lời
1) Ô tô điện là một phân khúc tăng trưởng nhanh.
2) Hàng xa xỉ là một phân khúc sinh lời.$q$ WHERE word = $q$a fast-growing / profitable segment$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a disease that causes death, or one that lasts a long time$q$, translation = $q$bệnh gây tử vong / chết người / mãn tính
1) Bệnh dại gây tử vong nếu không được điều trị.
2) Sốt rét vẫn là một căn bệnh chết người ở nhiều nước.
3) Tiểu đường là một bệnh mãn tính kéo dài suốt đời.$q$ WHERE word = $q$a fatal / deadly / chronic disease$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the place where a journey finally ends$q$, translation = $q$điểm đến cuối cùng / sau cùng
1) Sau ba chuyến bay, chúng tôi đến điểm đến cuối cùng.
2) Với nhiều người leo núi, Everest là điểm đến sau cùng.$q$ WHERE word = $q$a final / ultimate destination$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a customer or person who pays a company for its professional services$q$, translation = $q$khách hàng của một công ty
Phần lớn khách hàng của công ty chúng tôi là các doanh nghiệp nhỏ cần tư vấn pháp lý.$q$ WHERE word = $q$a firm's client$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person who moved to a country themselves, or whose parents did, as the first or second generation there$q$, translation = $q$người nhập cư thế hệ thứ nhất / thứ hai
1) Là người nhập cư thế hệ thứ nhất, anh ấy đã làm việc rất chăm chỉ.
2) Người nhập cư thế hệ thứ hai thường thấy thân thuộc với hai nền văn hóa.$q$ WHERE word = $q$a first-generation / second-generation immigrant$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a belief or starting point that is mistaken and makes an argument weak$q$, translation = $q$một giả định / tiền đề sai
1) Kế hoạch dựa trên một giả định sai.
2) Lập luận dựa trên một tiền đề sai.$q$ WHERE word = $q$a flawed assumption / premise$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way of doing things that can change easily to suit different needs$q$, translation = $q$cách tiếp cận / hệ thống / sự sắp xếp linh hoạt
1) Giáo viên cần cách tiếp cận linh hoạt để phù hợp với nhiều người học.
2) Một hệ thống linh hoạt cho phép sinh viên học theo tốc độ riêng.
3) Chúng tôi đạt được thỏa thuận linh hoạt về việc làm tại nhà.$q$ WHERE word = $q$a flexible approach / system / arrangement$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a rate or market that can change or adapt easily to circumstances$q$, translation = $q$mức giá / thị trường linh hoạt
1) Ngân hàng đưa ra mức lãi suất linh hoạt thay đổi theo nền kinh tế.
2) Thị trường lao động linh hoạt giúp việc thuê và sa thải dễ dàng hơn.$q$ WHERE word = $q$a flexible rate / market$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a large amount of water suddenly covers or destroys a place$q$, translation = $q$một trận lũ tấn công / cuốn qua một nơi
1) Trận lũ tấn công thành phố mà không báo trước.
2) Trận lũ cuốn trôi xe cộ và cầu cống.$q$ WHERE word = $q$a flood hits / sweeps somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a bad bodily reaction to a food, to peanuts or on the skin$q$, translation = $q$dị ứng thực phẩm / đậu phộng / da
1) Các nhà hàng phải xem trọng việc dị ứng thực phẩm.
2) Dị ứng đậu phộng khiến anh ấy phải đọc kỹ mọi nhãn mác.
3) Dị ứng da có thể gây ngứa và phát ban.$q$ WHERE word = $q$a food / peanut / skin allergy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a parent who temporarily cares for a child, who legally adopts a child, or who gave birth to a child$q$, translation = $q$cha mẹ nuôi dưỡng / cha mẹ nhận nuôi / cha mẹ ruột
1) Cha mẹ nuôi dưỡng chăm sóc một đứa trẻ trong thời gian ngắn.
2) Cha mẹ nhận nuôi đã nuôi dạy cô bằng tình yêu thương lớn lao.
3) Một số đứa trẻ không bao giờ gặp được cha mẹ ruột.$q$ WHERE word = $q$a foster / adoptive / birth parent$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a large mass of ice slowly turns to water or shrinks back$q$, translation = $q$một sông băng tan chảy / lùi dần
1) Sông băng tan chảy nhanh hơn mỗi năm.
2) Sông băng đã lùi lại vài ki-lô-mét.$q$ WHERE word = $q$a glacier melts / retreats$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an agreement, decision or win that is so important it will be remembered in history$q$, translation = $q$thỏa thuận / quyết định / chiến thắng lịch sử
1) Hai quốc gia ký một thỏa thuận lịch sử.
2) Tòa đưa ra một quyết định lịch sử.
3) Đội ăn mừng một chiến thắng lịch sử.$q$ WHERE word = $q$a historic agreement / decision / victory$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an important event, occasion or moment that will be remembered in history$q$, translation = $q$sự kiện / dịp / khoảnh khắc lịch sử
1) Cuộc đổ bộ là một sự kiện lịch sử.
2) Đám cưới là một dịp lịch sử.
3) Đó là một khoảnh khắc lịch sử của đất nước.$q$ WHERE word = $q$a historic event / occasion / moment$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a violent storm strikes or ruins a place$q$, translation = $q$một cơn bão tấn công / phá hủy một nơi
1) Cơn bão tấn công hòn đảo vào ban đêm.
2) Cơn bão phá hủy bến cảng.$q$ WHERE word = $q$a hurricane hits / destroys somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an important, high-ranking or well-known person involved in politics$q$, translation = $q$một chính trị gia hàng đầu / cấp cao / nổi bật
1) Một chính trị gia hàng đầu ủng hộ cải cách.
2) Một chính trị gia cấp cao từ chức hôm nay.
3) Bà ấy là một chính trị gia nổi bật trong vùng.$q$ WHERE word = $q$a leading / senior / prominent politician$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a system of rules and structures within which laws, regulation or politics operate$q$, translation = $q$khuôn khổ pháp lý / quản lý / chính trị
1) Một khuôn khổ pháp lý rõ ràng bảo vệ người lao động.
2) Ngành công nghiệp cần một khung quản lý.
3) Cải cách cần một khuôn khổ chính trị ổn định.$q$ WHERE word = $q$a legal / regulatory / political framework$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a result or person that is probable or seems likely to succeed$q$, translation = $q$một kết quả / ứng viên nhiều khả năng
1) Hòa là kết quả nhiều khả năng nhất.
2) Cô ấy là một ứng viên sáng giá cho công việc.$q$ WHERE word = $q$a likely outcome / candidate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a discussion with strong opinions that is energetic, heated or still continuing$q$, translation = $q$cuộc tranh luận sôi nổi / gay gắt / đang diễn ra
1) Chủ đề này khơi ra một cuộc tranh luận sôi nổi trong lớp.
2) Một cuộc tranh luận gay gắt diễn ra sau thông báo.
3) Đó vẫn là một cuộc tranh luận đang diễn ra giữa các nhà khoa học.$q$ WHERE word = $q$a lively / intense / ongoing debate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a dependence on a harmful substance or habit that lasts long or is severe$q$, translation = $q$sự nghiện lâu dài / mãn tính / nghiêm trọng
1) Phục hồi sau một cơn nghiện lâu dài mất nhiều năm.
2) Anh ấy tìm kiếm sự giúp đỡ cho một cơn nghiện mãn tính.
3) Một cơn nghiện nghiêm trọng có thể hủy hoại sự nghiệp của một người.$q$ WHERE word = $q$a long-term / chronic / serious addiction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way between places: the principal road, the shortest way, or one with attractive views$q$, translation = $q$tuyến đường chính / trực tiếp / có cảnh đẹp
1) Tuyến đường chính vào thành phố thường đông đúc.
2) Tuyến đường trực tiếp tiết kiệm một giờ.
3) Chúng tôi đi theo tuyến đường có cảnh đẹp dọc bờ biển.$q$ WHERE word = $q$a main / direct / scenic route$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person or thing that strongly affects how others think or behave$q$, translation = $q$một ảnh hưởng lớn / tốt / xấu
1) Mạng xã hội là một ảnh hưởng lớn đối với thanh thiếu niên.
2) Cô ấy là một ảnh hưởng tốt cho cả đội.
3) Bạn xấu có thể là một ảnh hưởng xấu.$q$ WHERE word = $q$a major / good / bad influence$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a clear and noticeable difference, improvement or rise$q$, translation = $q$sự tương phản / cải thiện / gia tăng rõ rệt
1) Có một sự tương phản rõ rệt giữa hai thành phố.
2) Đội đã cho thấy sự cải thiện rõ rệt.
3) Có một sự gia tăng rõ rệt về doanh số.$q$ WHERE word = $q$a marked contrast / improvement / increase$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a sudden loss of blood supply to the brain, of a mild, serious or deadly kind$q$, translation = $q$đột quỵ nhẹ / nặng / gây tử vong
1) Anh ấy hồi phục nhanh sau một cơn đột quỵ nhẹ.
2) Một cơn đột quỵ nặng có thể khiến bệnh nhân bị liệt.
3) Đáng buồn là cô ấy qua đời sau một cơn đột quỵ gây tử vong.$q$ WHERE word = $q$a minor / severe / fatal stroke$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a perfect example of being efficient or of being extremely good$q$, translation = $q$một hình mẫu về hiệu quả / sự xuất sắc
1) Nhà máy là một hình mẫu về hiệu quả.
2) Công việc của cô ấy là một hình mẫu của sự xuất sắc.$q$ WHERE word = $q$a model of efficiency / excellence$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a thing in today's or another culture that has the same role as another$q$, translation = $q$phiên bản tương đương hiện đại / về văn hóa
1) Điện thoại thông minh là phiên bản hiện đại của lá thư.
2) Lễ hội này không có thứ tương đương về văn hóa ở nước ngoài.$q$ WHERE word = $q$a modern / cultural equivalent$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a situation where a choice must be made between two conflicting moral principles$q$, translation = $q$một thế lưỡng nan về đạo đức / luân lý
1) Bác sĩ đối mặt với một thế lưỡng nan về đạo đức.
2) Thí nghiệm làm nảy sinh một thế lưỡng nan về luân lý.$q$ WHERE word = $q$a moral / ethical dilemma$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a quantity, danger or expense so small that it is not worth considering$q$, translation = $q$một lượng / rủi ro / chi phí không đáng kể
1) Chỉ một lượng không đáng kể bị lãng phí.
2) Rủi ro là không đáng kể.
3) Chi phí tăng thêm không đáng kể.$q$ WHERE word = $q$a negligible amount / risk / cost$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an influence, effect or contribution so small that it is not worth considering$q$, translation = $q$tác động / ảnh hưởng / đóng góp không đáng kể
1) Sự thay đổi có tác động không đáng kể đến chi phí.
2) Loại thuốc có tác dụng không đáng kể.
3) Đóng góp của họ là không đáng kể.$q$ WHERE word = $q$a negligible impact / effect / contribution$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a position or attitude on an issue that is neutral, firm or based on morals$q$, translation = $q$một lập trường trung lập / cứng rắn / đạo đức
1) Quốc gia giữ lập trường trung lập trong cuộc chiến.
2) Chính phủ có lập trường cứng rắn với tội phạm.
3) Anh ấy giữ lập trường đạo đức chống lại sự gian lận.$q$ WHERE word = $q$a neutral / tough / moral stance$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a new or coming period of one thousand years$q$, translation = $q$một thiên niên kỷ mới / kế tiếp
Một thiên niên kỷ mới mang đến công nghệ và ý tưởng mới.$q$ WHERE word = $q$a new / next millennium$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$types of statement in a study: no effect, one that can be tested, or another explanation$q$, translation = $q$giả thuyết không / có thể kiểm chứng / thay thế
1) Giả thuyết không cho rằng không có tác động thực sự.
2) Một giả thuyết tốt phải là giả thuyết có thể kiểm chứng.
3) Các nhà khoa học cũng cân nhắc một giả thuyết thay thế.$q$ WHERE word = $q$a null / testable / alternative hypothesis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a picture or photo shows or portrays something$q$, translation = $q$một bức tranh / bức ảnh khắc họa điều gì
1) Bức tranh khắc họa một ngôi làng yên bình.
2) Bức ảnh khắc họa cuộc sống trong chiến tranh.$q$ WHERE word = $q$a painting / photograph depicts something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a circular chart divided into slices to show proportions of a whole$q$, translation = $q$biểu đồ tròn cho thấy / thể hiện điều gì
1) Biểu đồ tròn cho thấy cách mọi người chi tiêu thu nhập.
2) Biểu đồ tròn thể hiện tỉ trọng của từng khu vực.$q$ WHERE word = $q$a pie chart shows / displays something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a technique or idea that is new and the first of its kind$q$, translation = $q$kỹ thuật / khái niệm tiên phong
1) Bác sĩ phẫu thuật dùng một kỹ thuật tiên phong để cứu người.
2) Đó là một khái niệm tiên phong vào thời điểm ấy.$q$ WHERE word = $q$a pioneering technique / concept$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a role, time or person that is extremely important to the outcome of something$q$, translation = $q$vai trò / khoảnh khắc / nhân vật then chốt
1) Người cố vấn đóng vai trò then chốt trong thành công của học sinh.
2) Chuyến đi đó là một khoảnh khắc bước ngoặt trong đời tôi.
3) Cô ấy là một nhân vật then chốt trong phong trào.$q$ WHERE word = $q$a pivotal role / moment / figure$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a set of beliefs and ideas on which a political, religious or economic system is based$q$, translation = $q$một hệ tư tưởng chính trị / tôn giáo / kinh tế
1) Đảng được xây dựng trên một hệ tư tưởng chính trị rõ ràng.
2) Cuộc xung đột bị thúc đẩy bởi hệ tư tưởng tôn giáo.
3) Cải cách phản ánh một hệ tư tưởng kinh tế mới.$q$ WHERE word = $q$a political / religious / economic ideology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very strong tropical storm that is violent or causes deaths$q$, translation = $q$một cơn bão nhiệt đới mạnh / chết người
1) Một cơn bão mạnh buộc hàng nghìn người phải sơ tán.
2) Một cơn bão chết người đã cướp đi nhiều sinh mạng.$q$ WHERE word = $q$a powerful / deadly typhoon$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a problem has its origin in a fact or a wrong belief$q$, translation = $q$một vấn đề bắt nguồn từ một sự thật / quan niệm sai
1) Cuộc xung đột bắt nguồn từ một sự hiểu lầm đơn giản.
2) Nỗi sợ bắt nguồn từ một quan niệm sai phổ biến.$q$ WHERE word = $q$a problem stems from a fact / misconception$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very deep and far-reaching alteration or effect on something$q$, translation = $q$sự thay đổi / tác động / ảnh hưởng sâu sắc
1) Internet đã tạo ra một sự thay đổi sâu sắc cho xã hội.
2) Chuyến đi có tác động sâu sắc đến sự nghiệp của cô ấy.
3) Âm nhạc có thể tác động sâu sắc đến tâm trạng.
4) Thầy của anh ấy có ảnh hưởng sâu sắc đến anh.$q$ WHERE word = $q$a profound change / impact / effect / influence$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a deep, strong feeling of something$q$, translation = $q$một cảm giác sâu sắc về điều gì
Việc đi du lịch mang cho tôi một cảm giác tự do sâu sắc.$q$ WHERE word = $q$a profound sense of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a long period without rain that is lengthy, serious or causes great damage$q$, translation = $q$một đợt hạn hán kéo dài / nghiêm trọng / tàn khốc
1) Một đợt hạn hán kéo dài đã phá hỏng vụ mùa.
2) Một đợt hạn hán nghiêm trọng khiến các con sông khô cạn.
3) Một đợt hạn hán tàn khốc buộc các gia đình phải di dời.$q$ WHERE word = $q$a prolonged / severe / devastating drought$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person or company that may become a customer$q$, translation = $q$Chúng tôi luôn chuẩn bị kỹ trước khi gặp một khách hàng tiềm năng.$q$ WHERE word = $q$a prospective client$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a document or regulation says something clearly in writing$q$, translation = $q$một báo cáo / quy định nêu điều gì
1) Báo cáo nêu rằng doanh số đã tăng.
2) Quy định nêu rằng không được mang thú cưng.$q$ WHERE word = $q$a report / rule states something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a quiet area of homes, or an area in poor, neglected condition$q$, translation = $q$khu dân cư / khu phố xuống cấp
1) Khu vực này là một khu dân cư yên tĩnh.
2) Thành phố đang cải tạo một khu phố xuống cấp.$q$ WHERE word = $q$a residential / run-down neighbourhood$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a countryside region, its close-knit community or its people, away from cities$q$, translation = $q$khu vực / cộng đồng / dân cư nông thôn
1) Nhiều người trẻ rời khu vực nông thôn để lên thành phố.
2) Cộng đồng nông thôn rất gắn bó.
3) Dân cư nông thôn đang dần thu hẹp.$q$ WHERE word = $q$a rural area / community / population$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an economy or road in the countryside$q$, translation = $q$kinh tế / đường nông thôn
1) Nông nghiệp nâng đỡ nền kinh tế nông thôn.
2) Đường nông thôn thường hẹp và quanh co.$q$ WHERE word = $q$a rural economy / road$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a residential area that is safe, pleasant or peaceful to live in$q$, translation = $q$khu phố an toàn / tốt / yên tĩnh
1) Cha mẹ muốn nuôi con trong một khu phố an toàn.
2) Đó là một khu dân cư tốt với những người thân thiện.
3) Họ chuyển đến một khu phố yên tĩnh.$q$ WHERE word = $q$a safe / good / quiet neighbourhood$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$general agreement among scientists, many people, or most people$q$, translation = $q$một sự đồng thuận khoa học / rộng rãi / chung
1) Có một sự đồng thuận khoa học về biến đổi khí hậu.
2) Kế hoạch nhận được sự đồng thuận rộng rãi.
3) Sự đồng thuận chung là nó hiệu quả.$q$ WHERE word = $q$a scientific / broad / general consensus$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an idea explaining facts, supported by evidence, or explaining how living things change over time$q$, translation = $q$một lý thuyết khoa học / tiến hóa
1) Một lý thuyết khoa học phải được bằng chứng ủng hộ.
2) Lý thuyết tiến hóa giải thích sự đa dạng của sự sống.$q$ WHERE word = $q$a scientific / evolutionary theory$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$one of the parts into which something is divided$q$, translation = $q$một phần / đoạn của điều gì
Mỗi phần của biểu đồ tròn cho thấy một nhóm tuổi khác nhau.$q$ WHERE word = $q$a segment of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a difficult task or problem that tests a person's ability or effort$q$, translation = $q$một thử thách nghiêm trọng / thực sự / lớn / to lớn
1) Nghèo đói vẫn là một thử thách nghiêm trọng với khu vực.
2) Học một ngôn ngữ là một thử thách thực sự.
3) Kinh phí là một thử thách lớn cho dự án.$q$ WHERE word = $q$a serious / real / major / great challenge$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a serious, frequent or deadly bodily reaction to a substance$q$, translation = $q$dị ứng nặng / phổ biến / đe dọa tính mạng
1) Một cơn dị ứng nặng có thể cần cấp cứu.
2) Sốt cỏ khô là một dạng dị ứng rất phổ biến.
3) Dị ứng đậu phộng có thể đe dọa tính mạng.$q$ WHERE word = $q$a severe / common / life-threatening allergy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a strong effect on something or someone, important, deep or long-lasting$q$, translation = $q$tác động đáng kể / sâu sắc / lâu dài
1) Người thầy đã có tác động đáng kể đến cuộc đời tôi.
2) Cuộc chiến có tác động sâu sắc đến quốc gia.
3) Cuộc cải cách có tác động lâu dài đến các trường học.$q$ WHERE word = $q$a significant / profound / lasting impact$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a drawing that explains something, either simple, complicated or showing its basic structure$q$, translation = $q$sơ đồ đơn giản / phức tạp / có tính nguyên lý
1) Một sơ đồ đơn giản giúp ý tưởng dễ hiểu.
2) Sơ đồ phức tạp mất thời gian để đọc.
3) Một sơ đồ nguyên lý giải thích hệ thống dây điện.$q$ WHERE word = $q$a simple / complex / schematic diagram$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a mother or father who raises a child without a partner$q$, translation = $q$cha/mẹ đơn thân
1) Làm cha/mẹ đơn thân khi vẫn đi làm toàn thời gian rất mệt mỏi.
2) Các bậc cha mẹ đơn thân thường phải dựa vào hỗ trợ của chính phủ.$q$ WHERE word = $q$a single / lone parent$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person who comes to live in a country with job skills, or without legal permission$q$, translation = $q$người nhập cư có tay nghề / bất hợp pháp
1) Quốc gia chào đón những người nhập cư có tay nghề.
2) Chính phủ siết chặt với người nhập cư bất hợp pháp.$q$ WHERE word = $q$a skilled / illegal immigrant$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a teacher or learner of sociology, the study of society$q$, translation = $q$giáo sư / giảng viên / sinh viên xã hội học
1) Một giáo sư xã hội học đã nghiên cứu các cộng đồng trực tuyến.
2) Giảng viên xã hội học giao cho chúng tôi đề tài về bất bình đẳng.
3) Là sinh viên xã hội học, tôi khảo sát thói quen của mọi người.$q$ WHERE word = $q$a sociology professor / lecturer / student$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$one step or phase in a repeating cycle or a process$q$, translation = $q$một giai đoạn của một chu trình / quy trình
1) Mưa là một giai đoạn của vòng tuần hoàn nước.
2) Giai đoạn cuối của quy trình là đóng gói.$q$ WHERE word = $q$a stage of a cycle / process$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a particular point or phase in how something grows or changes over time$q$, translation = $q$một giai đoạn phát triển / tiến hóa
1) Đứa trẻ đang ở giai đoạn phát triển sớm.
2) Sơ đồ cho thấy từng giai đoạn tiến hóa.$q$ WHERE word = $q$a stage of development / evolution$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person, or hospital department, dealing with a sudden loss of blood flow to the brain$q$, translation = $q$nạn nhân / bệnh nhân / khoa đột quỵ
1) Một nạn nhân đột quỵ cần được chăm sóc y tế ngay lập tức.
2) Bệnh nhân đột quỵ dần học lại cách đi.
3) Cô ấy được đưa gấp đến khoa đột quỵ của bệnh viện.$q$ WHERE word = $q$a stroke victim / patient / unit$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a powerful flow of water in a river or sea, or a large movement of ocean water$q$, translation = $q$một dòng chảy mạnh / dòng hải lưu
1) Người bơi được cảnh báo về dòng chảy mạnh.
2) Các dòng hải lưu ảnh hưởng đến khí hậu thế giới.$q$ WHERE word = $q$a strong / ocean current$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an investigation or inquiry that takes place afterwards$q$, translation = $q$một cuộc điều tra / truy vấn sau đó
1) Một cuộc điều tra sau đó đã hé lộ sự thật.
2) Cuộc truy vấn sau đó kéo dài nhiều tháng.$q$ WHERE word = $q$a subsequent investigation / enquiry$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a year, event or generation that comes after another$q$, translation = $q$một năm / sự kiện / thế hệ tiếp theo
1) Doanh số tăng trong những năm tiếp theo.
2) Sự kiện sau đó còn lớn hơn.
3) Các thế hệ sau được hưởng những lợi ích.$q$ WHERE word = $q$a subsequent year / event / generation$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a result that is achieved or is probable$q$, translation = $q$một kết quả thành công / nhiều khả năng
1) Làm việc chăm chỉ dẫn đến một kết quả thành công.
2) Một sự thỏa hiệp là kết quả nhiều khả năng nhất.$q$ WHERE word = $q$a successful / likely outcome$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a conclusion or theory that is uncertain and not yet fully confirmed$q$, translation = $q$một kết luận / lý thuyết dè dặt
1) Các nhà nghiên cứu đưa ra một kết luận dè dặt.
2) Hiện tại đó chỉ là một lý thuyết mang tính thăm dò.$q$ WHERE word = $q$a tentative conclusion / theory$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a cautious, uncertain step or agreement that may change later$q$, translation = $q$một bước đi / thỏa thuận / giao kèo thăm dò
1) Hai bên thực hiện một bước đi thăm dò hướng tới hòa bình.
2) Họ đạt được một thỏa thuận sơ bộ.
3) Một giao kèo sơ bộ đã được ký.$q$ WHERE word = $q$a tentative step / agreement / deal$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a set of ideas that explains how something works or why it happens$q$, translation = $q$lý thuyết về điều gì
Einstein đã phát triển một lý thuyết về tính tương đối làm thay đổi vật lý.$q$ WHERE word = $q$a theory of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a society, country or attitude that accepts people and views different from one's own$q$, translation = $q$xã hội / đất nước / thái độ cởi mở
1) Một xã hội cởi mở chào đón những người thuộc mọi nền tảng.
2) Canada thường được xem là một đất nước cởi mở.
3) Một thái độ cởi mở giúp giảm xung đột.$q$ WHERE word = $q$a tolerant society / country / attitude$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a place people travel to for sightseeing, holidays, or that is liked by many$q$, translation = $q$điểm đến du lịch / nghỉ dưỡng / nổi tiếng / yêu thích
1) Thành phố này là một điểm đến du lịch nổi tiếng.
2) Hòn đảo là một điểm nghỉ dưỡng hoàn hảo.
3) Nó đã trở thành điểm đến phổ biến với sinh viên.
4) Nhật Bản là điểm đến yêu thích của tôi.$q$ WHERE word = $q$a tourist / holiday / popular / favourite destination$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way along which goods are traded, people escape or supplies are carried$q$, translation = $q$tuyến thương mại / thoát hiểm / tiếp tế
1) Con sông từng là một tuyến thương mại quan trọng.
2) Đường hầm được dùng làm lối thoát hiểm.
3) Quân đội cắt đứt tuyến tiếp tế của địch.$q$ WHERE word = $q$a trade / escape / supply route$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a good and acceptable reason, point or argument that is well founded$q$, translation = $q$một lý do / luận điểm / lập luận hợp lý
1) Bạn cần một lý do hợp lý để vắng thi.
2) Cô ấy nêu một luận điểm hợp lý trong cuộc tranh luận.
3) Đó là một lập luận hợp lý đáng cân nhắc.$q$ WHERE word = $q$a valid reason / point / argument$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$something very useful or important: an asset, lesson, resource or experience$q$, translation = $q$tài sản / bài học / nguồn lực / trải nghiệm quý giá
1) Nhân viên trung thực là tài sản quý giá của bất kỳ công ty nào.
2) Thất bại đã dạy tôi một bài học quý giá.
3) Nước là một nguồn tài nguyên quý mà chúng ta phải bảo vệ.
4) Du học là một trải nghiệm quý giá.$q$ WHERE word = $q$a valuable asset / lesson / resource / experience$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a useful, important gift of help, or an object worth a lot$q$, translation = $q$đóng góp / món đồ có giá trị
1) Tình nguyện viên đóng góp giá trị cho cộng đồng.
2) Bảo tàng trưng bày nhiều món đồ có giá trị.$q$ WHERE word = $q$a valuable contribution / item$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an illness caused by a virus, bacteria or affecting the breathing system$q$, translation = $q$nhiễm trùng do virus / vi khuẩn / hô hấp
1) Nhiễm virus thường tự khỏi.
2) Nhiễm khuẩn thường cần kháng sinh.
3) Nhiễm trùng đường hô hấp có thể khiến việc thở khó khăn.$q$ WHERE word = $q$a viral / bacterial / respiratory infection$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a situation in which someone is weak and easily harmed or put at a disadvantage$q$, translation = $q$một vị thế yếu / dễ bị tổn thương
Vay mượn quá nhiều có thể đẩy các gia đình vào vị thế dễ bị tổn thương.$q$ WHERE word = $q$a vulnerable position$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a brother or sister who is younger or older than oneself$q$, translation = $q$em / anh chị lớn hơn
1) Đứa em của tôi luôn bắt chước mọi thứ tôi làm.
2) Là anh/chị lớn, tôi phải làm gương tốt.$q$ WHERE word = $q$a younger / elder sibling$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to give up a project, plan or ship, leaving it unfinished or deserted$q$, translation = $q$từ bỏ một dự án / kế hoạch / con tàu
1) Công ty từ bỏ dự án sau những thua lỗ.
2) Họ từ bỏ kế hoạch khi hết kinh phí.
3) Thủy thủ đoàn phải bỏ tàu.$q$ WHERE word = $q$abandon a project / plan / ship$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$plentiful wildlife, evidence or resources; more than enough$q$, translation = $q$động vật hoang dã / bằng chứng / tài nguyên dồi dào
1) Khu bảo tồn là nơi sinh sống của hệ động vật hoang dã phong phú.
2) Có bằng chứng dồi dào cho tuyên bố này.
3) Đất nước này có nguồn tài nguyên thiên nhiên dồi dào.$q$ WHERE word = $q$abundant wildlife / evidence / resources$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$with a person who goes with you to protect, supervise or guide you$q$, translation = $q$được hộ tống bởi vệ sĩ / người lớn / người hộ tống
1) Ngôi sao luôn được một vệ sĩ đi cùng khắp nơi.
2) Du khách nhỏ tuổi phải có người lớn đi kèm.
3) Đoàn xe được cảnh sát hộ tống.$q$ WHERE word = $q$accompanied by a bodyguard / adult / escort$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$with someone who goes along with you$q$, translation = $q$được ai đó đi cùng
Bọn trẻ được giáo viên đi cùng trong chuyến đi.$q$ WHERE word = $q$accompanied by someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$correct and exact facts or numbers, without mistakes$q$, translation = $q$thông tin / số liệu chính xác
1) Du khách cần thông tin chính xác về thời tiết.
2) Báo cáo dựa trên số liệu chính xác.$q$ WHERE word = $q$accurate information / figures$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to accept or admit that something exists or is important$q$, translation = $q$thừa nhận sự tồn tại / tầm quan trọng của điều gì
1) Báo cáo thừa nhận sự tồn tại của vấn đề.
2) Hầu hết mọi người công nhận tầm quan trọng của giáo dục.$q$ WHERE word = $q$acknowledge the existence / importance of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to accept that something is necessary$q$, translation = $q$thừa nhận sự cần thiết của điều gì
Chính phủ thừa nhận sự cần thiết của năng lượng sạch hơn.$q$ WHERE word = $q$acknowledge the need for something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to look for something in an eager, pressing or very anxious way$q$, translation = $q$chủ động / khẩn cấp / tuyệt vọng tìm kiếm
1) Công ty đang chủ động tìm kiếm đối tác mới.
2) Người tị nạn khẩn cấp tìm thức ăn và chỗ ở.
3) Anh ấy tuyệt vọng tìm cách thoát khỏi nợ nần.$q$ WHERE word = $q$actively / urgently / desperately seek$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the state of being unable to stop doing or using something harmful$q$, translation = $q$sự nghiện thứ gì
Việc nghiện mạng xã hội là một vấn đề ngày càng tăng ở thanh thiếu niên.$q$ WHERE word = $q$addiction to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal with or try to solve a problem, issue or worry$q$, translation = $q$giải quyết một vấn đề / khía cạnh / mối lo ngại
1) Kế hoạch nhằm giải quyết vấn đề nhà ở.
2) Chúng ta phải giải quyết khía cạnh này gấp.
3) Báo cáo giải quyết những mối lo ngại của công chúng.$q$ WHERE word = $q$address a problem / issue / concern$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change numbers or rates slightly to make them more accurate or suitable$q$, translation = $q$điều chỉnh số liệu / mức giá
1) Nhà kinh tế điều chỉnh số liệu theo lạm phát.
2) Ngân hàng có thể điều chỉnh lãi suất tháng tới.$q$ WHERE word = $q$adjust figures / rates$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to get used to a new situation or condition$q$, translation = $q$thích nghi với điều gì
Cần thời gian để thích nghi với cuộc sống ở một đất nước mới.$q$ WHERE word = $q$adjust to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to give a person a dose of medicine, an injection, a vaccine or a drug$q$, translation = $q$cho dùng một liều / mũi tiêm / vắc-xin / thuốc
1) Bác sĩ cho dùng một liều nhỏ trước.
2) Một y tá tiêm mũi đó rất nhanh.
3) Các tình nguyện viên đã giúp tiêm vắc-xin cho hàng nghìn người.$q$ WHERE word = $q$administer a dose / injection / vaccine / drug$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to give a person a dose of medicine, treatment or a drug$q$, translation = $q$cho ai dùng thứ gì
Y tá cho bệnh nhân dùng thuốc đúng giờ.$q$ WHERE word = $q$administer something to someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to take a particular position or opinion on an issue$q$, translation = $q$đưa ra / giữ một lập trường về điều gì
1) Công ty đưa ra một lập trường rõ ràng về vấn đề.
2) Cô ấy giữ lập trường kiên định chống lại kế hoạch.$q$ WHERE word = $q$adopt / take a stance on something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to give professional advice to a client, or to act for them, especially in law$q$, translation = $q$tư vấn / đại diện cho khách hàng
1) Luật sư được trả tiền để tư vấn cho khách hàng về các hợp đồng phức tạp.
2) Một luật sư giỏi sẽ đại diện cho khách hàng một cách công bằng tại tòa.$q$ WHERE word = $q$advise / represent a client$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to publicly support and recommend reform or new laws$q$, translation = $q$ủng hộ cải cách / luật pháp
1) Nhiều chuyên gia ủng hộ cải cách hệ thống thuế.
2) Các nhà vận động ủng hộ luật bảo vệ động vật hoang dã.$q$ WHERE word = $q$advocate reform / legislation$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to influence how something turns out, how good it is or how well it works$q$, translation = $q$ảnh hưởng đến kết quả / chất lượng / hiệu suất
1) Thời tiết có thể ảnh hưởng đến kết quả trận đấu.
2) Nguyên liệu kém ảnh hưởng đến chất lượng sản phẩm.
3) Thiếu ngủ ảnh hưởng đến hiệu suất làm việc.$q$ WHERE word = $q$affect the outcome / quality / performance$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$people who suffer from allergies, or the signs of an allergic reaction$q$, translation = $q$người bị dị ứng / triệu chứng dị ứng
1) Người bị dị ứng thường cảm thấy tệ hơn vào mùa xuân.
2) Triệu chứng dị ứng gồm hắt hơi và chảy nước mắt.$q$ WHERE word = $q$allergy sufferers / symptoms$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change how something develops or how it ends$q$, translation = $q$thay đổi tiến trình / kết quả của điều gì
1) Phát hiện này đã thay đổi tiến trình lịch sử.
2) Một bàn thắng đã thay đổi kết quả trận đấu.$q$ WHERE word = $q$alter the course / outcome of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$words that can be understood in more than one way, so unclear$q$, translation = $q$ngôn ngữ / cách diễn đạt mơ hồ
Cách diễn đạt mơ hồ trong hợp đồng gây nhầm lẫn.$q$ WHERE word = $q$ambiguous language / wording$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a building or vehicle that has been left and is no longer used or cared for$q$, translation = $q$một tòa nhà / chiếc xe bị bỏ hoang
1) Tòa nhà bị bỏ hoang đã trở nên không an toàn.
2) Cảnh sát kéo đi chiếc xe bị bỏ lại.$q$ WHERE word = $q$an abandoned building / vehicle$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a plentiful, more than enough amount of something available$q$, translation = $q$một nguồn cung dồi dào của điều gì
Khu vực này có nguồn cung nước sạch dồi dào.$q$ WHERE word = $q$an abundant supply of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a statement about, or forecast of, something that is correct$q$, translation = $q$một mô tả / dự đoán chính xác
1) Cô ấy đưa ra một mô tả chính xác về người đàn ông.
2) Mô hình đưa ra một dự đoán chính xác.$q$ WHERE word = $q$an accurate description / prediction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a problem of being addicted, or a place or person that helps people with addiction$q$, translation = $q$vấn đề nghiện / phòng khám / chuyên viên tư vấn cai nghiện
1) Cuối cùng anh ấy thừa nhận mình có vấn đề về nghiện.
2) Cô ấy được giới thiệu đến một phòng khám cai nghiện.
3) Một chuyên viên tư vấn cai nghiện đã giúp anh ấy hồi phục.$q$ WHERE word = $q$an addiction problem / clinic / counsellor$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a medical condition in which the body reacts badly to a substance$q$, translation = $q$dị ứng với thứ gì
Cô ấy bị dị ứng với bụi nên ngày nào cũng dọn phòng.$q$ WHERE word = $q$an allergy to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a glacier located in Antarctica or in Alaska$q$, translation = $q$một sông băng ở Nam Cực / Alaska
1) Các nhà khoa học nghiên cứu một sông băng ở Nam Cực mỗi năm.
2) Một sông băng ở Alaska thu hút nhiều du khách.$q$ WHERE word = $q$an Antarctic / Alaskan glacier$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$someone studying or teaching the study of past human societies, or the university department for it$q$, translation = $q$sinh viên / giáo sư / khoa khảo cổ học
1) Là sinh viên khảo cổ, cô ấy dành mùa hè để khai quật.
2) Một giáo sư khảo cổ đã thuyết trình về các ngôi mộ cổ.
3) Khoa khảo cổ nhận được nguồn tài trợ mới.$q$ WHERE word = $q$an archaeology student / professor / department$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a teacher, keen fan or space project connected with astronomy$q$, translation = $q$giáo sư / người đam mê / sứ mệnh thiên văn học
1) Một giáo sư thiên văn giải thích cách các ngôi sao hình thành.
2) Là người đam mê thiên văn, anh ấy sở hữu ba kính viễn vọng.
3) Sứ mệnh thiên văn đã gửi về những hình ảnh tuyệt đẹp.$q$ WHERE word = $q$an astronomy professor / enthusiast / mission$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person who is independent and able to make their own decisions$q$, translation = $q$một cá nhân tự chủ
Đại học khuyến khích sinh viên trở thành những cá nhân tự chủ biết tự suy nghĩ.$q$ WHERE word = $q$an autonomous individual$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an area, state or province that governs itself and has some independence$q$, translation = $q$vùng / nước cộng hòa / tỉnh tự trị
1) Khu vực này được trao quy chế là một vùng tự trị.
2) Nó trở thành một nước cộng hòa tự trị sau chiến tranh.
3) Chính phủ lập ra một tỉnh tự trị có luật riêng.$q$ WHERE word = $q$an autonomous region / republic / province$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very serious problem in the economy, in money matters, or in people's welfare$q$, translation = $q$khủng hoảng kinh tế / tài chính / nhân đạo
1) Đất nước đối mặt với một cuộc khủng hoảng kinh tế sâu sắc.
2) Sự sụp đổ của ngân hàng gây ra một cuộc khủng hoảng tài chính.
3) Cuộc chiến dẫn đến một cuộc khủng hoảng nhân đạo.$q$ WHERE word = $q$an economic / financial / humanitarian crisis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a teacher, qualification or university unit connected with the study of economics$q$, translation = $q$giáo sư / bằng / khoa kinh tế học
1) Một giáo sư kinh tế cảnh báo về lạm phát gia tăng.
2) Cô ấy lấy bằng kinh tế từ một trường đại học hàng đầu.
3) Khoa kinh tế tổ chức một khóa học buổi tối được ưa chuộng.$q$ WHERE word = $q$an economics professor / degree / department$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way of doing something that works well without wasting time or effort$q$, translation = $q$một cách thức hiệu quả
Nhân viên xử lý khiếu nại của chúng tôi một cách hiệu quả.$q$ WHERE word = $q$an efficient manner$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$using something in a way that wastes as little as possible$q$, translation = $q$việc sử dụng hiệu quả thứ gì
Tái chế là cách sử dụng hiệu quả các nguồn lực hạn chế.$q$ WHERE word = $q$an efficient use of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way of doing something that works well without wasting time or effort$q$, translation = $q$một cách làm hiệu quả
Email là một cách hiệu quả để tiếp cận nhiều người cùng lúc.$q$ WHERE word = $q$an efficient way of doing something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a figure or quantity that is a rough calculation, not exact$q$, translation = $q$một tỉ lệ / lượng ước tính
1) Một tỉ lệ ước tính sinh viên đi du học.
2) Một lượng thực phẩm ước tính bị lãng phí mỗi ngày.$q$ WHERE word = $q$an estimated percentage / amount$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a universe, economy or population that is growing larger$q$, translation = $q$vũ trụ / nền kinh tế / dân số đang mở rộng
1) Các nhà khoa học mô tả một vũ trụ đang giãn nở.
2) Một nền kinh tế mở rộng tạo ra nhiều việc làm hơn.
3) Một dân số tăng lên cần nhiều nhà ở hơn.$q$ WHERE word = $q$an expanding universe / economy / population$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a belief, vision or opinion based on perfect ideals rather than practical reality$q$, translation = $q$quan niệm / tầm nhìn / quan điểm lý tưởng hóa
1) Anh ấy có quan niệm lý tưởng rằng tiền không thể thay đổi con người.
2) Các nhà hoạt động trẻ thường chia sẻ một tầm nhìn lý tưởng về tương lai.
3) Cô ấy giữ một quan điểm lý tưởng về bản chất con người.$q$ WHERE word = $q$an idealistic notion / vision / view$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a thing exactly like another, or one of two siblings born together who look exactly alike$q$, translation = $q$một bản sao / cặp sinh đôi giống hệt
1) Bức tranh là một bản sao giống hệt bản gốc.
2) Họ là cặp sinh đôi giống hệt nhau.$q$ WHERE word = $q$an identical copy / twin$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$people who have moved to live in a new country, as a group or as workers$q$, translation = $q$dân số / cộng đồng / lao động nhập cư
1) Thành phố có một lượng dân nhập cư lớn.
2) Cộng đồng nhập cư tổ chức các lễ hội riêng.
3) Nhiều lao động nhập cư hỗ trợ các ngành công nghiệp địa phương.$q$ WHERE word = $q$an immigrant population / community / worker$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an effect, often a strong one, on the environment or economy$q$, translation = $q$tác động đến môi trường / nền kinh tế
1) Nhựa có tác động to lớn đến môi trường.
2) Đại dịch có tác động lớn đến nền kinh tế.$q$ WHERE word = $q$an impact on the environment / economy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the first feeling, answer or opinion you have about something$q$, translation = $q$phản ứng / hồi đáp / ấn tượng ban đầu
1) Phản ứng ban đầu của tôi là sự sốc.
2) Hồi đáp ban đầu với kế hoạch là tích cực.
3) Ấn tượng ban đầu về thành phố thật tuyệt vời.$q$ WHERE word = $q$an initial reaction / response / impression$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a performer of sung drama, or the theatre where it is staged$q$, translation = $q$ca sĩ / nhà hát ô-pê-ra
1) Cô ấy luyện tập nhiều năm để trở thành ca sĩ ô-pê-ra.
2) Chúng tôi xem một buổi biểu diễn tại nhà hát ô-pê-ra.$q$ WHERE word = $q$an opera singer / house$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a general impression, rise or majority considering everything as a whole$q$, translation = $q$ấn tượng / mức tăng / đa số tổng thể
1) Ấn tượng tổng thể rất tích cực.
2) Có một sự gia tăng chung về nhu cầu.
3) Đảng giành được đa số tuyệt đối.$q$ WHERE word = $q$an overall impression / increase / majority$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a district or surroundings in a town or city$q$, translation = $q$khu phố / môi trường đô thị
1) Cô ấy lớn lên ở một khu phố đô thị nhộn nhịp.
2) Môi trường đô thị có thể khiến người ta căng thẳng.$q$ WHERE word = $q$an urban neighbourhood / environment$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$similar or comparable to something else in some way$q$, translation = $q$tương tự với điều gì
Bộ não đôi khi được mô tả là tương tự một chiếc máy tính.$q$ WHERE word = $q$analogous to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to study information, figures, outcomes or patterns in detail to understand them$q$, translation = $q$phân tích dữ liệu / số liệu / kết quả / xu hướng
1) Nhà nghiên cứu phân tích dữ liệu để tìm ra các quy luật hữu ích.
2) Nhà kinh tế phân tích số liệu để dự đoán tăng trưởng.
3) Chúng tôi phân tích kết quả trước khi rút ra kết luận.
4) Chuyên viên phân tích xu hướng để tư vấn cho doanh nghiệp.$q$ WHERE word = $q$analyse data / statistics / results / trends$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to examine something in detail, questioning it or paying close attention$q$, translation = $q$phân tích điều gì một cách phản biện / cẩn thận
1) Sinh viên phải phân tích nguồn một cách phản biện, không chỉ chấp nhận.
2) Nhà khoa học phân tích từng mẫu một cách cẩn thận.$q$ WHERE word = $q$analyse something critically / carefully$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to put things side by side in a line$q$, translation = $q$sắp xếp mọi thứ thành một hàng
Những chiếc ghế được sắp thành một hàng ngay ngắn.$q$ WHERE word = $q$arrange things in a row$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be present at a meeting, conference or funeral$q$, translation = $q$dự một cuộc họp / hội nghị / đám tang
1) Tôi phải dự một cuộc họp chiều nay.
2) Hàng nghìn người tham dự hội nghị.
3) Nhiều bạn bè đến dự đám tang.$q$ WHERE word = $q$attend a meeting / conference / funeral$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to go to a place or event often, or only seldom$q$, translation = $q$tham dự thường xuyên / hiếm khi
1) Cô ấy đến phòng gym thường xuyên.
2) Anh ấy hiếm khi đến lớp vào thứ Hai.$q$ WHERE word = $q$attend regularly / rarely$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to stop, prevent or bring about the loss of too much water from the body$q$, translation = $q$tránh / ngăn ngừa / gây mất nước
1) Uống nước thường xuyên giúp bạn tránh mất nước.
2) Vận động viên uống chất điện giải để ngăn mất nước.
3) Thời tiết nóng có thể nhanh chóng gây mất nước.$q$ WHERE word = $q$avoid / prevent / cause dehydration$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to have a harmful, unfavourable or immediate effect on something$q$, translation = $q$ảnh hưởng xấu / bất lợi / trực tiếp đến điều gì
1) Hạn hán ảnh hưởng xấu đến vụ mùa.
2) Tiếng ồn có thể ảnh hưởng bất lợi đến sự tập trung.
3) Quy định mới ảnh hưởng trực tiếp đến học sinh.$q$ WHERE word = $q$badly / adversely / directly affect something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to harm something seriously, severely or in a way that cannot be repaired$q$, translation = $q$làm hư hại nặng / nghiêm trọng / vĩnh viễn
1) Đám cháy làm hư hại nặng tòa nhà.
2) Cơn bão làm hư hại nghiêm trọng mùa màng.
3) Ô nhiễm có thể gây tổn hại vĩnh viễn cho sức khỏe.$q$ WHERE word = $q$badly / severely / permanently damage something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be stopped or delayed for a time with no end date set$q$, translation = $q$bị đình chỉ / hoãn vô thời hạn
1) Các chuyến bay bị đình chỉ vô thời hạn.
2) Trận đấu bị hoãn vô thời hạn.$q$ WHERE word = $q$be suspended / postponed indefinitely$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$unfairly prejudiced against, or favouring, a person or group$q$, translation = $q$thiên vị chống lại / ủng hộ ai đó
1) Bài báo có vẻ thiên lệch chống lại người biểu tình.
2) Hệ thống thiên vị người giàu.$q$ WHERE word = $q$biased against / in favour of someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$news coverage or research that is unfair because it favours one side$q$, translation = $q$đưa tin / nghiên cứu thiên lệch
1) Đưa tin thiên lệch khiến công chúng hiểu sai.
2) Nghiên cứu thiên lệch không thể tin cậy.$q$ WHERE word = $q$biased reporting / research$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to transmit a programme or event on radio or TV as it happens$q$, translation = $q$phát sóng trực tiếp
Buổi lễ được phát sóng trực tiếp khắp thế giới.$q$ WHERE word = $q$broadcast live$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to send out a programme so people can watch it or listen to it$q$, translation = $q$phát sóng trên truyền hình / đài
1) Trận đấu được phát sóng trên truyền hình.
2) Buổi phỏng vấn được phát trên đài.$q$ WHERE word = $q$broadcast on television / radio$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to construct, make better or damage basic systems such as roads and power$q$, translation = $q$xây dựng / cải thiện / phá hủy cơ sở hạ tầng
1) Chính phủ dự định xây dựng cơ sở hạ tầng mới.
2) Đường sá tốt hơn cải thiện cơ sở hạ tầng.
3) Trận động đất đã phá hủy phần lớn cơ sở hạ tầng.$q$ WHERE word = $q$build / improve / destroy infrastructure$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to judge the quality or value of something with great care$q$, translation = $q$đánh giá điều gì một cách cẩn thận
Bạn nên đánh giá cẩn thận từng lựa chọn trước khi quyết định.$q$ WHERE word = $q$carefully evaluate something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create, lessen or relieve overcrowding and blockage, especially of traffic$q$, translation = $q$gây ra / giảm / làm dịu tắc nghẽn
1) Quá nhiều xe gây tắc nghẽn ở trung tâm.
2) Xe buýt tốt hơn có thể giảm tắc nghẽn.
3) Một con đường mới có thể làm dịu tắc nghẽn.$q$ WHERE word = $q$cause / reduce / ease congestion$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to mark, come near to, or arrive at the start of a thousand-year period$q$, translation = $q$ăn mừng / tiến đến / chạm tới thiên niên kỷ
1) Cả thế giới ăn mừng thiên niên kỷ mới.
2) Khi tiến đến thiên niên kỷ mới, hy vọng dâng cao.$q$ WHERE word = $q$celebrate / approach / reach the millennium$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the medical condition of being very overweight, in children or in adults$q$, translation = $q$béo phì ở trẻ em / người lớn
1) Béo phì ở trẻ em thường dẫn đến các vấn đề sức khỏe về sau.
2) Béo phì ở người lớn làm tăng nguy cơ bệnh tim.$q$ WHERE word = $q$childhood / adult obesity$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to select or like the second of two things just mentioned$q$, translation = $q$chọn / thích cái sau
Giữa cà phê và trà, tôi luôn thích cái sau (trà).$q$ WHERE word = $q$choose / prefer the latter$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to state that something is true, in a false, correct or mistaken way$q$, translation = $q$tuyên bố sai sự thật / đúng đắn / sai lầm
1) Quảng cáo tuyên bố sai sự thật rằng sản phẩm chữa được bệnh.
2) Cô ấy khẳng định đúng đắn rằng dữ liệu ủng hộ quan điểm của mình.
3) Anh ấy đã sai lầm khi cho rằng bài kiểm tra dễ.$q$ WHERE word = $q$claim falsely / rightly / wrongly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say again and again that something is true$q$, translation = $q$Các chính trị gia liên tục khẳng định rằng nền kinh tế đang cải thiện.$q$ WHERE word = $q$claim repeatedly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the style of ancient Greece and Rome, or the stories and myths of that era$q$, translation = $q$kiến trúc / thần thoại cổ điển
1) Bảo tàng là một ví dụ đẹp về kiến trúc cổ điển.
2) Câu chuyện lấy cảm hứng từ thần thoại cổ điển.$q$ WHERE word = $q$classical architecture / mythology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$traditional, serious music or ballet of a long-established style$q$, translation = $q$nhạc / ba-lê cổ điển
1) Nhạc cổ điển giúp tôi tập trung.
2) Cô ấy học ba-lê cổ điển từ nhỏ.$q$ WHERE word = $q$classical music / ballet$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$facts or signs that show very clearly that something is true$q$, translation = $q$bằng chứng rõ ràng / mạnh mẽ / thuyết phục
1) Có bằng chứng rõ ràng rằng hút thuốc gây hại sức khỏe.
2) Bằng chứng mạnh mẽ ủng hộ kết luận này.
3) Tòa cần bằng chứng thuyết phục để kết tội anh ta.$q$ WHERE word = $q$clear / strong / conclusive evidence$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to see or show the difference between things in an obvious or effortless way$q$, translation = $q$phân biệt rõ ràng / dễ dàng
1) Các nhãn giúp bạn phân biệt rõ ràng từng loại.
2) Chuyên gia có thể dễ dàng nhận ra hàng giả.$q$ WHERE word = $q$clearly / easily distinguish$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$in a way that is very obvious, or the most noticeable$q$, translation = $q$rõ ràng / rõ rệt nhất
1) Sự khác biệt được thể hiện rõ ràng trên biểu đồ.
2) Sự thay đổi rõ rệt nhất ở nhóm thanh thiếu niên.$q$ WHERE word = $q$clearly / most marked$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$explained precisely, in a restricted way or in a wide way$q$, translation = $q$được định nghĩa rõ ràng / hẹp / rộng
1) Các quy tắc phải được định nghĩa rõ ràng để tránh nhầm lẫn.
2) Thuật ngữ được định nghĩa hẹp trong nghiên cứu này.
3) 'Nghệ thuật' có thể được định nghĩa rộng để bao gồm nhiều thứ.$q$ WHERE word = $q$clearly / narrowly / broadly defined$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$branches of psychology studying mental illness treatment or mental processes like thinking and memory$q$, translation = $q$tâm lý học lâm sàng / nhận thức
1) Tâm lý học lâm sàng điều trị lo âu và trầm cảm.
2) Tâm lý học nhận thức nghiên cứu trí nhớ và sự chú ý.$q$ WHERE word = $q$clinical / cognitive psychology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to look very like something, or be extremely similar to it$q$, translation = $q$rất giống / giống hệt điều gì
1) Bản sao rất giống bản gốc.
2) Hai ngôn ngữ này giống nhau đến lạ.$q$ WHERE word = $q$closely / strongly resemble something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to watch someone or something very carefully$q$, translation = $q$quan sát kỹ lưỡng
Bác sĩ theo dõi kỹ bệnh nhân sau phẫu thuật.$q$ WHERE word = $q$closely observe$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$small in amount or size when compared with something else$q$, translation = $q$tương đối ít / nhỏ
1) Quốc gia này chi tương đối ít cho quốc phòng.
2) Thị trấn này tương đối nhỏ.$q$ WHERE word = $q$comparatively little / small$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$relatively uncommon or low in price when compared with other things$q$, translation = $q$tương đối hiếm / rẻ
1) Những cơn bão như vậy tương đối hiếm ở đây.
2) Chiếc điện thoại này tương đối rẻ.$q$ WHERE word = $q$comparatively rare / inexpensive$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to examine how things are alike or different by putting them side by side$q$, translation = $q$so sánh điều gì với điều gì
1) Bài luận so sánh cuộc sống thành phố với nông thôn.
2) Người ta thường so sánh cuộc sống của mình với người khác trên mạng.$q$ WHERE word = $q$compare something with / to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$evidence or data that is very convincing and hard to doubt$q$, translation = $q$bằng chứng / dữ liệu thuyết phục
1) Nghiên cứu đưa ra bằng chứng thuyết phục.
2) Dữ liệu thuyết phục ủng hộ kết luận.$q$ WHERE word = $q$compelling evidence / data$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change something completely or very greatly$q$, translation = $q$biến đổi điều gì hoàn toàn / mạnh mẽ
1) Việc cải tạo đã thay đổi hoàn toàn ngôi nhà.
2) Điện thoại thông minh đã thay đổi mạnh mẽ cuộc sống hằng ngày.$q$ WHERE word = $q$completely / dramatically transform something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$evidence that is certain, impossible to deny, or specific and real$q$, translation = $q$bằng chứng thuyết phục / không thể chối cãi / cụ thể
1) Không có bằng chứng thuyết phục rằng chế độ ăn đó hiệu quả.
2) Đoạn video là bằng chứng không thể chối cãi về sự việc.
3) Chúng ta cần bằng chứng cụ thể trước khi buộc tội ai.$q$ WHERE word = $q$conclusive / irrefutable / concrete proof$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change from vapour into liquid as rain or small drops$q$, translation = $q$ngưng tụ thành mưa / giọt nước
1) Hơi nước ngưng tụ thành mưa.
2) Hơi nước ngưng tụ thành những giọt nhỏ trên kính.$q$ WHERE word = $q$condense into rain / droplets$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to lead a group of musicians by directing their playing$q$, translation = $q$chỉ huy một dàn nhạc
Ông ấy đã chỉ huy dàn nhạc hơn hai mươi năm.$q$ WHERE word = $q$conduct an orchestra$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$matching or not contradicting a finding or hypothesis$q$, translation = $q$phù hợp với một phát hiện / giả thuyết
1) Kết quả phù hợp với các phát hiện của những nghiên cứu trước.
2) Dữ liệu phù hợp với giả thuyết ban đầu của chúng tôi.$q$ WHERE word = $q$consistent with a finding / hypothesis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$in agreement with something, or not contradicting it$q$, translation = $q$phù hợp / nhất quán với điều gì
Câu trả lời của cô ấy nhất quán với những dữ kiện chúng tôi đã biết.$q$ WHERE word = $q$consistent with something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to go on without any end being fixed$q$, translation = $q$Tình hình không thể tiếp diễn vô thời hạn.$q$ WHERE word = $q$continue indefinitely$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to catch, pass on or cause an infection to spread$q$, translation = $q$mắc / lây truyền / phát tán nhiễm trùng
1) Bệnh nhân có thể bị nhiễm trùng ngay trong bệnh viện.
2) Tay bẩn dễ làm lây truyền nhiễm trùng.
3) Nơi đông đúc khiến nhiễm trùng lây lan nhanh.$q$ WHERE word = $q$contract / transmit / spread an infection$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$(of muscles) to tighten and shorten in a steady rhythm or very quickly$q$, translation = $q$co lại nhịp nhàng / nhanh chóng
1) Các cơ tim co lại một cách nhịp nhàng.
2) Các sợi cơ co lại nhanh chóng khi vận động.$q$ WHERE word = $q$contract rhythmically / rapidly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be strongly and obviously different from something else$q$, translation = $q$tương phản rõ rệt / hoàn toàn
1) Khu giàu có tương phản rõ rệt với khu nghèo.
2) Lời nói của anh ta tương phản hoàn toàn với hành động.$q$ WHERE word = $q$contrast sharply / starkly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be clearly different from something, especially when placed next to it$q$, translation = $q$tương phản với điều gì
Giọng nói điềm tĩnh của cô tương phản với sự hỗn loạn xung quanh.$q$ WHERE word = $q$contrast with something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to help to a large degree in achieving or causing something$q$, translation = $q$đóng góp lớn / đáng kể
1) Du lịch đóng góp lớn cho nền kinh tế địa phương.
2) Tập thể dục góp phần đáng kể vào sức khỏe tốt.$q$ WHERE word = $q$contribute greatly / significantly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to help to cause something to happen$q$, translation = $q$góp phần vào điều gì
Ô tô góp phần gây ô nhiễm không khí ở các thành phố.$q$ WHERE word = $q$contribute to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$armed forces or weapons that do not use nuclear, chemical or biological power$q$, translation = $q$lực lượng / vũ khí thông thường (phi hạt nhân)
1) Quốc gia này vẫn dựa vào lực lượng thông thường để phòng thủ.
2) Vũ khí thông thường gây ra phần lớn thương vong trong các cuộc chiến hiện đại.$q$ WHERE word = $q$conventional forces / weapons$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$ordinary, long-established medical care or ways of doing things$q$, translation = $q$phương pháp điều trị / cách làm truyền thống
1) Một số bệnh nhân thích điều trị truyền thống hơn y học thay thế.
2) Các phương pháp truyền thống vẫn hiệu quả với phần lớn nông dân.$q$ WHERE word = $q$conventional treatment / methods$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the commonly accepted ideas or ways of thinking about something$q$, translation = $q$quan niệm / lối nghĩ thông thường
1) Quan niệm thông thường cho rằng nên tiết kiệm trước khi chi tiêu.
2) Nghiên cứu của cô thách thức lối nghĩ thông thường về giấc ngủ.$q$ WHERE word = $q$conventional wisdom / thinking$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to communicate an idea or information to others$q$, translation = $q$Quảng cáo nhằm truyền tải một thông điệp rõ ràng một cách nhanh chóng.$q$ WHERE word = $q$convey a message$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to communicate a feeling or an idea of something to others$q$, translation = $q$truyền đạt một cảm giác / ấn tượng về điều gì
1) Bộ phim truyền tải một cảm giác hy vọng mạnh mẽ.
2) Bài phát biểu của cô tạo ấn tượng về sự tự tin.$q$ WHERE word = $q$convey a sense / impression of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to express a message, feeling or image in a clear, vivid, strong or exact way$q$, translation = $q$truyền đạt điều gì một cách sống động / mạnh mẽ / chính xác
1) Bức ảnh truyền tải khung cảnh một cách sống động.
2) Bài thơ truyền tải nỗi đau một cách mạnh mẽ.
3) Một bản đồ tốt thể hiện khoảng cách một cách chính xác.$q$ WHERE word = $q$convey something vividly / powerfully / accurately$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to heal, treat, defeat or struggle against a dependence on something harmful$q$, translation = $q$chữa / điều trị / vượt qua / chống lại cơn nghiện
1) Các bác sĩ vẫn đang tìm cách chữa khỏi cơn nghiện.
2) Các phòng khám điều trị nghiện bằng liệu pháp tâm lý và thuốc.
3) Nhiều người chật vật để tự mình vượt qua cơn nghiện.$q$ WHERE word = $q$cure / treat / overcome / fight an addiction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to harm how others see or trust someone$q$, translation = $q$làm tổn hại danh tiếng / uy tín của ai
1) Vụ bê bối làm tổn hại danh tiếng của anh ta.
2) Lời nói dối làm tổn hại uy tín của cô ấy.$q$ WHERE word = $q$damage someone's reputation / credibility$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to harm the natural world around us$q$, translation = $q$gây tổn hại cho môi trường
Rác thải nhựa gây tổn hại nghiêm trọng cho môi trường.$q$ WHERE word = $q$damage the environment$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$data or research results indicate or point to something$q$, translation = $q$dữ liệu / phát hiện cho thấy điều gì
1) Dữ liệu cho thấy nhiệt độ tăng đều.
2) Các phát hiện cho thấy chính sách đang hiệu quả.$q$ WHERE word = $q$data / findings suggest something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$many decades of fighting, disputes or lack of care$q$, translation = $q$hàng thập kỷ chiến tranh / xung đột / bị bỏ bê
1) Hàng thập kỷ chiến tranh khiến đất nước hoang tàn.
2) Hàng thập kỷ xung đột chia rẽ khu vực.
3) Hàng thập kỷ bị bỏ bê đã làm hư hại tòa nhà cũ.$q$ WHERE word = $q$decades of war / conflict / neglect$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to fall from one level to another, or by a certain amount$q$, translation = $q$giảm từ x xuống y / giảm đi x
1) Doanh số giảm từ 500 xuống 300 đơn vị.
2) Dân số giảm mười phần trăm.$q$ WHERE word = $q$decline from x to y / by x$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to explain exactly what a word or idea means$q$, translation = $q$định nghĩa một thuật ngữ / khái niệm
1) Sách giáo khoa định nghĩa rõ từng thuật ngữ mới.
2) Việc định nghĩa khái niệm trước khi tranh luận là quan trọng.$q$ WHERE word = $q$define a term / concept$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to state the meaning of something, or describe it through a particular idea$q$, translation = $q$định nghĩa điều gì là / theo nghĩa của điều gì
1) Luật định nghĩa trẻ em là bất kỳ ai dưới mười tám tuổi.
2) Thành công thường được định nghĩa theo tiền bạc.$q$ WHERE word = $q$define something as / in terms of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$proof that is clear and complete and leaves no doubt$q$, translation = $q$Vẫn chưa có bằng chứng xác đáng về sự sống trên các hành tinh khác.$q$ WHERE word = $q$definitive proof$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make the beginning of something happen later$q$, translation = $q$làm chậm sự khởi phát / bắt đầu của điều gì
1) Tập thể dục có thể làm chậm sự khởi phát của nhiều bệnh.
2) Thời tiết xấu làm chậm thời điểm bắt đầu chuyến đi.$q$ WHERE word = $q$delay the onset / start of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$having more than one possible meaning, either on purpose or to a great degree$q$, translation = $q$cố tình / rất mơ hồ
1) Câu trả lời cố tình mơ hồ.
2) Cách diễn đạt rất mơ hồ.$q$ WHERE word = $q$deliberately / highly ambiguous$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to find out what caused something or how big or serious it is$q$, translation = $q$xác định nguyên nhân / mức độ của điều gì
1) Điều tra viên sẽ xác định nguyên nhân vụ cháy.
2) Các xét nghiệm xác định mức độ thiệt hại.$q$ WHERE word = $q$determine the cause / extent of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to decide or control how something ends or what happens later$q$, translation = $q$quyết định kết quả / tương lai
1) Bài thi cuối kỳ sẽ quyết định kết quả.
2) Giáo dục có thể quyết định tương lai của một đứa trẻ.$q$ WHERE word = $q$determine the outcome / future$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to start to suffer from, identify or cause an allergy$q$, translation = $q$phát triển / chẩn đoán / kích hoạt dị ứng
1) Một số người lớn đột nhiên bị dị ứng với hải sản.
2) Bác sĩ có thể chẩn đoán dị ứng bằng một bài kiểm tra da đơn giản.
3) Phấn hoa có thể kích hoạt dị ứng vào mùa xuân.$q$ WHERE word = $q$develop / diagnose / trigger an allergy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create, put forward or work out an idea that explains something$q$, translation = $q$phát triển / đề xuất / xây dựng một lý thuyết
1) Các nhà khoa học phát triển một lý thuyết để giải thích phát hiện của họ.
2) Cô ấy đề xuất một lý thuyết mới về trí nhớ.
3) Phải mất nhiều năm để xây dựng lý thuyết một cách rõ ràng.$q$ WHERE word = $q$develop / propose / formulate a theory$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create or work out a new method, plan or idea$q$, translation = $q$phát triển một kỹ thuật / chiến lược / ý tưởng
1) Các nhà khoa học phát triển một kỹ thuật xét nghiệm mới.
2) Đội đã phát triển một chiến lược thông minh.
3) Cô ấy phát triển ý tưởng thành một kế hoạch hoàn chỉnh.$q$ WHERE word = $q$develop a technique / strategy / idea$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to grow or change gradually into something bigger or more advanced$q$, translation = $q$phát triển thành điều gì
Một ý tưởng nhỏ đã phát triển thành một doanh nghiệp thành công.$q$ WHERE word = $q$develop into something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be officially identified by a doctor as having an illness or condition$q$, translation = $q$được chẩn đoán mắc rối loạn / bệnh / khối u
1) Anh ấy được chẩn đoán mắc rối loạn giấc ngủ.
2) Cô ấy được chẩn đoán mắc một căn bệnh hiếm.
3) Bác sĩ chẩn đoán anh ấy có một khối u não.$q$ WHERE word = $q$diagnosed with a disorder / disease / tumour$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$told by a doctor that you have a particular serious illness$q$, translation = $q$được chẩn đoán mắc ung thư / tiểu đường / bạch cầu
1) Cô ấy được chẩn đoán mắc ung thư ở giai đoạn sớm.
2) Nhiều người lớn được chẩn đoán tiểu đường quá muộn.
3) Đứa trẻ được chẩn đoán mắc bệnh bạch cầu năm ngoái.$q$ WHERE word = $q$diagnosed with cancer / diabetes / leukaemia$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be unlike something else$q$, translation = $q$khác với điều gì
Tiếng Anh-Anh khác với tiếng Anh-Mỹ về chính tả.$q$ WHERE word = $q$differ from something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be clearly or noticeably different$q$, translation = $q$khác biệt đáng kể / rõ rệt
1) Hai bản báo cáo khác nhau đáng kể.
2) Giá cả khác nhau rõ rệt giữa các vùng.$q$ WHERE word = $q$differ significantly / markedly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to see or show the difference between things$q$, translation = $q$phân biệt giữa các thứ
Trẻ nhỏ không phải lúc nào cũng phân biệt được sự thật và tưởng tượng.$q$ WHERE word = $q$differentiate between things$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to show or see how one thing is different from another$q$, translation = $q$phân biệt điều gì với điều gì
Thương hiệu mạnh giúp phân biệt một sản phẩm với các đối thủ.$q$ WHERE word = $q$differentiate something from something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$hard or impossible to say beforehand what will happen$q$, translation = $q$khó / không thể dự đoán
1) Thời tiết rất khó dự đoán.
2) Hành vi con người gần như không thể dự đoán.$q$ WHERE word = $q$difficult / impossible to predict$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to become smaller or less important, or fewer, over time$q$, translation = $q$giảm về tầm quan trọng / kích thước / số lượng
1) Thị trấn giảm dần tầm quan trọng theo thời gian.
2) Các khu rừng đã thu nhỏ về diện tích.
3) Hổ hoang dã đã giảm về số lượng.$q$ WHERE word = $q$diminish in importance / size / number$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say that a claim, statement or accusation is not true$q$, translation = $q$phản bác một tuyên bố / khẳng định / cáo buộc
1) Các nhà khoa học phản bác tuyên bố rằng dữ liệu sai.
2) Cô ấy phản bác khẳng định của anh ta về nguyên nhân.
3) Công ty phản bác cáo buộc gian lận.$q$ WHERE word = $q$dispute a claim / assertion / allegation$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$clearly different or separate from something else$q$, translation = $q$khác biệt với điều gì
Hai loài này khá khác biệt với nhau.$q$ WHERE word = $q$distinct from something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to recognise or see the difference between things$q$, translation = $q$phân biệt giữa các thứ
Thật khó phân biệt giữa hai màu sắc này.$q$ WHERE word = $q$distinguish between things$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a long dry period damages or strikes a particular place$q$, translation = $q$hạn hán ảnh hưởng / tấn công một nơi
1) Hạn hán ảnh hưởng đến hàng triệu nông dân.
2) Hạn hán tấn công khu vực gần như mỗi mùa hè.$q$ WHERE word = $q$drought affects / hits somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a strong physical or mental need for drugs, nicotine or alcohol$q$, translation = $q$nghiện ma túy / nicotine / rượu
1) Nghiện ma túy phá hủy cả sức khỏe lẫn các mối quan hệ.
2) Nghiện nicotine khiến việc bỏ thuốc cực kỳ khó.
3) Nghiện rượu thường mang tính di truyền trong gia đình.$q$ WHERE word = $q$drug / nicotine / alcohol addiction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$branches of psychology studying learning in schools or the development of the mind over evolution$q$, translation = $q$tâm lý học giáo dục / tiến hóa
1) Tâm lý học giáo dục giúp giáo viên hiểu về việc học.
2) Tâm lý học tiến hóa giải thích nhiều bản năng của con người.$q$ WHERE word = $q$educational / evolutionary psychology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to accept and adopt a set of beliefs eagerly, or to refuse it$q$, translation = $q$đón nhận / chối bỏ một hệ tư tưởng
1) Nhiều người trẻ đón nhận hệ tư tưởng mới.
2) Đất nước chối bỏ hệ tư tưởng cũ.$q$ WHERE word = $q$embrace / reject an ideology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to meet a problem or difficulty, usually unexpectedly$q$, translation = $q$gặp phải một khó khăn / vấn đề
1) Du khách có thể gặp khó khăn khi qua biên giới.
2) Chúng tôi gặp một vấn đề nghiêm trọng với việc đặt chỗ.$q$ WHERE word = $q$encounter a difficulty / problem$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to meet opposition or attempts to stop something$q$, translation = $q$gặp phải sự kháng cự / phản đối
1) Kế hoạch gặp phải sự kháng cự từ người dân địa phương.
2) Ý tưởng mới thường gặp phản đối lúc đầu.$q$ WHERE word = $q$encounter resistance / opposition$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$completely or more than adequately shown to be right or reasonable$q$, translation = $q$hoàn toàn / hết sức chính đáng
1) Chi phí tăng thêm là hoàn toàn chính đáng nhờ kết quả.
2) Sự thận trọng của cô ấy hóa ra hết sức chính đáng.$q$ WHERE word = $q$entirely / amply justified$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$fully, quite or mostly in agreement or without contradiction$q$, translation = $q$hoàn toàn / khá / nhìn chung nhất quán
1) Câu chuyện của anh ấy hoàn toàn nhất quán từ đầu đến cuối.
2) Hai bản báo cáo khá nhất quán với nhau.
3) Ý kiến công chúng nhìn chung nhất quán giữa các vùng.$q$ WHERE word = $q$entirely / fairly / broadly consistent$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to completely get rid of a disease, poverty or the inability to read$q$, translation = $q$xóa bỏ bệnh tật / nghèo đói / nạn mù chữ
1) Vắc-xin đã giúp xóa bỏ căn bệnh.
2) Chương trình nhằm xóa bỏ nghèo đói.
3) Giáo dục có thể xóa bỏ nạn mù chữ.$q$ WHERE word = $q$eradicate disease / poverty / illiteracy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$easily harmed or attacked, especially, very or more and more so$q$, translation = $q$đặc biệt / rất / ngày càng dễ bị tổn thương
1) Các thị trấn ven biển đặc biệt dễ bị ngập lụt.
2) Trẻ sơ sinh rất dễ bị nhiễm trùng.
3) Các loài ngày càng dễ bị tổn thương khi môi trường sống thu hẹp.$q$ WHERE word = $q$especially / highly / increasingly vulnerable$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to show or create a connection or relationship between people or things$q$, translation = $q$thiết lập một mối liên hệ / quan hệ
1) Nghiên cứu thiết lập mối liên hệ giữa chế độ ăn và tâm trạng.
2) Hai trường đã thiết lập một mối quan hệ.$q$ WHERE word = $q$establish a link / relationship$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to calculate roughly how much something costs, is worth or earns$q$, translation = $q$ước tính chi phí / giá trị / doanh thu
1) Chúng tôi ước tính chi phí dự án cẩn thận.
2) Người định giá ước tính giá trị của khu đất.
3) Công ty ước tính doanh thu cho năm tới.$q$ WHERE word = $q$estimate cost / value / revenue$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to give a rough calculation of the value or amount as x$q$, translation = $q$ước tính điều gì ở mức x
Các chuyên gia ước tính thiệt hại ở mức hai triệu đô la.$q$ WHERE word = $q$estimate something at x$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$including many different ethnic groups or cultures$q$, translation = $q$đa dạng về sắc tộc / văn hóa
1) Thành phố này đa dạng về sắc tộc.
2) Trường học có một cộng đồng học sinh đa dạng về văn hóa.$q$ WHERE word = $q$ethnically / culturally diverse$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to move people out of danger, tell them of danger, or recommend action to them$q$, translation = $q$sơ tán / cảnh báo / khuyến cáo cư dân
1) Cảnh sát sơ tán cư dân trước trận lụt.
2) Giới chức cảnh báo cư dân về cơn bão.
3) Hội đồng khuyến cáo cư dân tiết kiệm nước.$q$ WHERE word = $q$evacuate / warn / advise residents$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to judge carefully the nature, effects or danger of something$q$, translation = $q$đánh giá một tình huống / tác động / rủi ro
1) Nhà quản lý phải đánh giá tình huống trước khi hành động.
2) Chúng ta cần đánh giá tác động của chính sách mới.
3) Nhà đầu tư đánh giá rủi ro cẩn thận trước tiên.$q$ WHERE word = $q$evaluate a situation / impact / risk$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to judge how well something works or how successful it is$q$, translation = $q$đánh giá hiệu quả của điều gì
Nghiên cứu đánh giá hiệu quả của việc học trực tuyến.$q$ WHERE word = $q$evaluate the effectiveness of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$evidence or research gives a sign or indication that something is true$q$, translation = $q$bằng chứng / nghiên cứu cho thấy
1) Bằng chứng cho thấy giấc ngủ cải thiện trí nhớ.
2) Nghiên cứu cho thấy mối liên hệ giữa căng thẳng và bệnh tật.$q$ WHERE word = $q$evidence / research suggests$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$facts that show something exists or is true, or that support a claim$q$, translation = $q$bằng chứng về / cho điều gì
1) Có bằng chứng rõ ràng về biến đổi khí hậu.
2) Các nhà khoa học tìm thấy bằng chứng cho lý thuyết mới của họ.$q$ WHERE word = $q$evidence of / for something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to develop gradually from an earlier form, or to turn into something different$q$, translation = $q$tiến hóa từ / thành điều gì
1) Loài chim tiến hóa từ khủng long.
2) Cửa hàng phát triển thành một chuỗi toàn cầu.$q$ WHERE word = $q$evolve from / into something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make a problem, situation or conflict worse$q$, translation = $q$làm trầm trọng thêm một vấn đề / tình hình / xung đột
1) Cắt giảm ngân quỹ sẽ làm trầm trọng thêm vấn đề.
2) Việc mua hàng hoảng loạn làm tình hình tệ hơn.
3) Sự can thiệp từ bên ngoài làm xung đột thêm trầm trọng.$q$ WHERE word = $q$exacerbate a problem / situation / conflict$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make tensions or symptoms worse$q$, translation = $q$làm gia tăng căng thẳng / triệu chứng
1) Lời nhận xét làm gia tăng căng thẳng giữa các nhóm.
2) Căng thẳng có thể làm trầm trọng thêm các triệu chứng bệnh.$q$ WHERE word = $q$exacerbate tensions / symptoms$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to check a sick person's body to find out what is wrong$q$, translation = $q$khám cho bệnh nhân
Y tá khám cho từng bệnh nhân trong phòng chờ.$q$ WHERE word = $q$examine a patient$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to look at someone's body thoroughly to check their health$q$, translation = $q$khám cho ai một cách kỹ lưỡng
Bác sĩ khám cho đứa trẻ một cách kỹ lưỡng trước khi đưa lời khuyên.$q$ WHERE word = $q$examine someone carefully$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to increase the amount a place can hold or produce, or the output$q$, translation = $q$mở rộng công suất / sản xuất
1) Nhà máy dự định mở rộng công suất vào năm tới.
2) Công ty mở rộng sản xuất để đáp ứng nhu cầu.$q$ WHERE word = $q$expand capacity / production$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to grow larger very quickly or by a large amount$q$, translation = $q$mở rộng nhanh chóng / mạnh mẽ
1) Thành phố mở rộng nhanh chóng vào những năm 1990.
2) Mua sắm trực tuyến mở rộng mạnh mẽ.$q$ WHERE word = $q$expand rapidly / dramatically$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$able to govern or act independently to a strong, fairly high or large degree$q$, translation = $q$tự chủ mạnh mẽ / tương đối / phần lớn
1) Mỗi phòng ban tự chủ rất mạnh và chống lại sự kiểm soát tập trung.
2) Nhóm tương đối tự chủ nhưng vẫn báo cáo cho một quản lý.
3) Chi nhánh phần lớn tự chủ trong các quyết định hằng ngày.$q$ WHERE word = $q$fiercely / relatively / largely autonomous$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to discover, bring together or gather facts that prove something$q$, translation = $q$tìm / thu thập / góp nhặt bằng chứng
1) Nhà nghiên cứu tìm bằng chứng bằng cách làm thí nghiệm.
2) Thám tử thu thập bằng chứng tại hiện trường.
3) Chúng tôi góp nhặt bằng chứng từ nhiều nguồn khác nhau.$q$ WHERE word = $q$find / gather / collect evidence$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to set up something so that it is secure, strong or accepted, firmly or fast$q$, translation = $q$thiết lập điều gì một cách vững chắc / nhanh chóng
1) Thương hiệu đã khẳng định vững chắc vị thế trên thị trường.
2) Cô ấy nhanh chóng tạo dựng được danh tiếng tốt.$q$ WHERE word = $q$firmly / quickly establish something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$faulty thinking that leads to wrong conclusions$q$, translation = $q$logic / lập luận sai
1) Kết luận của anh ta xuất phát từ logic sai.
2) Bài luận cho thấy lập luận sai.$q$ WHERE word = $q$flawed logic / reasoning$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a way of working in which hours or place of work can be adjusted$q$, translation = $q$làm việc linh hoạt / giờ làm linh hoạt
1) Nhiều công ty hiện cho phép làm việc linh hoạt.
2) Giờ làm linh hoạt giúp các bậc cha mẹ cân bằng cuộc sống.$q$ WHERE word = $q$flexible working / working hours$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to move smoothly and continuously, without being blocked$q$, translation = $q$chảy tự do / đều đặn / liên tục
1) Con sông chảy tự do sau khi đập được dỡ bỏ.
2) Giao thông lưu thông đều đặn suốt buổi sáng.
3) Thông tin lưu chuyển liên tục trên mạng.$q$ WHERE word = $q$flow freely / steadily / constantly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$economics based on open competition, or the study of how poor countries grow$q$, translation = $q$kinh tế thị trường tự do / kinh tế phát triển
1) Kinh tế thị trường tự do ủng hộ ít sự can thiệp của chính phủ.
2) Kinh tế phát triển nghiên cứu cách các nước nghèo có thể tăng trưởng.$q$ WHERE word = $q$free-market / development economics$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$as seen from someone's point of view$q$, translation = $q$từ góc nhìn của ai đó
Câu chuyện được kể từ góc nhìn của một đứa trẻ.$q$ WHERE word = $q$from the perspective of someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$using little fuel or energy to do its work$q$, translation = $q$tiết kiệm nhiên liệu / năng lượng
1) Người mua ngày càng muốn xe tiết kiệm nhiên liệu.
2) Những ngôi nhà tiết kiệm năng lượng có hóa đơn thấp hơn nhiều.$q$ WHERE word = $q$fuel / energy efficient$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$having had all the vaccine doses needed for protection$q$, translation = $q$đã tiêm phòng đầy đủ
Du khách nên tiêm phòng đầy đủ trước khi đến một số quốc gia.$q$ WHERE word = $q$fully vaccinated$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause strong interest, media attention or public disagreement$q$, translation = $q$tạo ra sự hào hứng / chú ý của truyền thông / tranh cãi
1) Đoạn giới thiệu tạo ra sự hào hứng lớn.
2) Sự kiện thu hút rất nhiều sự chú ý của truyền thông.
3) Những lời bình luận của anh ta gây tranh cãi.$q$ WHERE word = $q$generate excitement / publicity / controversy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to produce money, electricity or energy$q$, translation = $q$tạo ra thu nhập / điện / năng lượng
1) Doanh nghiệp tạo ra một nguồn thu nhập ổn định.
2) Các trang trại gió tạo ra điện sạch.
3) Con đập tạo ra năng lượng cho cả khu vực.$q$ WHERE word = $q$generate income / electricity / power$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$having been changed by altering its genes or its chemical makeup$q$, translation = $q$biến đổi gen / hóa học
1) Một số cây trồng bị biến đổi gen.
2) Sản phẩm chứa tinh bột biến đổi hóa học.$q$ WHERE word = $q$genetically / chemically modified$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$having become smaller or less, slowly or by a large amount$q$, translation = $q$giảm dần dần / đáng kể
1) Ảnh hưởng của ông ấy giảm dần.
2) Rủi ro đã giảm đáng kể.$q$ WHERE word = $q$gradually / considerably diminished$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to affect the way someone thinks, behaves or decides$q$, translation = $q$có / gây ảnh hưởng lên ai đó
1) Cha mẹ có ảnh hưởng mạnh mẽ lên con cái.
2) Quảng cáo gây ảnh hưởng mạnh mẽ lên người mua.$q$ WHERE word = $q$have / exert influence on someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause, or be afraid of, unpleasant effects of an action$q$, translation = $q$gây ra / lo sợ hệ lụy
1) Loại thuế mới có thể gây hệ lụy rộng khắp.
2) Người lao động lo sợ hệ lụy khi lên tiếng.$q$ WHERE word = $q$have / fear repercussions$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to have disadvantages or negative features$q$, translation = $q$có nhược điểm
Học trực tuyến có nhược điểm cũng như ưu điểm.$q$ WHERE word = $q$have drawbacks$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$an advantage that helps health, the economy or society$q$, translation = $q$lợi ích về sức khỏe / kinh tế / xã hội
1) Đạp xe mang lại lợi ích sức khỏe rõ ràng.
2) Du lịch mang lại lợi ích kinh tế cho thị trấn.
3) Hoạt động tình nguyện mang lại lợi ích xã hội thực sự.$q$ WHERE word = $q$health / economic / social benefit$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$illness affecting the heart, the lungs or the kidneys$q$, translation = $q$bệnh tim / phổi / thận
1) Chế độ ăn kém làm tăng nguy cơ bệnh tim.
2) Hút thuốc là nguyên nhân chính gây bệnh phổi.
3) Bệnh thận thường tiến triển chậm và âm thầm.$q$ WHERE word = $q$heart / lung / kidney disease$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$working very well with little waste of time, energy or money$q$, translation = $q$hiệu quả cao / cực kỳ hiệu quả
1) Các nhà máy hiện đại có hiệu quả cao và lãng phí rất ít.
2) Động cơ mới cực kỳ hiệu quả.$q$ WHERE word = $q$highly / extremely efficient$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$very probable or becoming more and more probable$q$, translation = $q$rất / ngày càng có khả năng
1) Rất có khả năng giá sẽ tăng.
2) Lũ lụt ngày càng có khả năng xảy ra do biến đổi khí hậu.$q$ WHERE word = $q$highly / increasingly likely$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$argued about in a very angry, strong way$q$, translation = $q$bị tranh cãi gay gắt / kịch liệt
1) Kết quả bị cả hai bên tranh cãi gay gắt.
2) Đường biên giới đã bị tranh chấp kịch liệt trong nhiều năm.$q$ WHERE word = $q$hotly / bitterly disputed$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$exactly the same as something else in every detail$q$, translation = $q$giống hệt với điều gì
Câu trả lời của cô ấy giống hệt của tôi.$q$ WHERE word = $q$identical to / with something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make something wider$q$, translation = $q$tăng / mở rộng chiều rộng
1) Hội đồng dự định tăng chiều rộng của lối đi.
2) Họ mở rộng chiều rộng cầu để an toàn hơn.$q$ WHERE word = $q$increase / extend the width$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make an amount or quantity larger or smaller$q$, translation = $q$tăng / giảm khối lượng
1) Nhà máy đã tăng khối lượng sản xuất năm ngoái.
2) Tái chế giúp giảm khối lượng rác.$q$ WHERE word = $q$increase / reduce volume$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to go up or get better by a very small amount$q$, translation = $q$tăng / nhích lên / cải thiện một chút
1) Giá tăng nhẹ vào tháng trước.
2) Doanh số nhích lên một chút.
3) Điểm của cô ấy cải thiện một chút.$q$ WHERE word = $q$increase / rise / improve marginally$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$people who originally belong to a place or live there$q$, translation = $q$cư dân bản địa / gốc / địa phương
1) Cư dân bản địa đã sống ở đây hàng thế kỷ.
2) Cư dân gốc bảo vệ khu rừng.
3) Cư dân địa phương phản đối nhà máy mới.$q$ WHERE word = $q$indigenous / native / local inhabitants$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be certain to cause something, because it cannot be avoided$q$, translation = $q$tất yếu dẫn đến / gây ra điều gì
1) Việc lạm dụng tài nguyên tất yếu dẫn đến thiếu hụt.
2) Sự bất cẩn tất yếu gây ra sai lầm.$q$ WHERE word = $q$inevitably lead to / result in something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$measures taken to stop infections from spreading or occurring$q$, translation = $q$kiểm soát / phòng ngừa nhiễm trùng
1) Bệnh viện tuân theo các quy tắc kiểm soát nhiễm trùng nghiêm ngặt.
2) Vệ sinh tốt là nền tảng của việc phòng ngừa nhiễm trùng.$q$ WHERE word = $q$infection control / prevention$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a fierce struggle between people or groups trying to win or be better than the others$q$, translation = $q$sự cạnh tranh / kình địch gay gắt
1) Có sự cạnh tranh gay gắt để vào các trường đại học hàng đầu.
2) Hai đội có một sự kình địch gay gắt.$q$ WHERE word = $q$intense competition / rivalry$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$extreme heat, pain, pressure or very close examination$q$, translation = $q$sức nóng / cơn đau / áp lực / sự soi xét dữ dội
1) Sức nóng dữ dội khiến việc đi bộ kiệt sức.
2) Cô ấy cảm thấy cơn đau dữ dội ở đầu gối.
3) Vận động viên thi đấu dưới áp lực dữ dội.
4) Quyết định bị soi xét gắt gao.$q$ WHERE word = $q$intense heat / pain / pressure / scrutiny$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to become involved in order to affect or stop a dispute, conflict or crisis$q$, translation = $q$can thiệp vào một tranh chấp / xung đột / khủng hoảng
1) Giáo viên can thiệp vào cuộc tranh chấp.
2) Liên Hợp Quốc can thiệp vào cuộc xung đột.
3) Ngân hàng can thiệp vào cuộc khủng hoảng.$q$ WHERE word = $q$intervene in a dispute / conflict / crisis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to step in yourself or in a direct way to affect a situation$q$, translation = $q$đích thân / trực tiếp can thiệp
1) Tổng thống đích thân can thiệp.
2) Chính phủ can thiệp trực tiếp vào thị trường.$q$ WHERE word = $q$intervene personally / directly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to bring in, take up or copy a system or example to follow$q$, translation = $q$giới thiệu / áp dụng / theo một mô hình
1) Trường học giới thiệu một mô hình giảng dạy mới.
2) Nhiều quốc gia đã áp dụng cùng một mô hình.
3) Chúng tôi theo một mô hình kinh doanh đơn giản.$q$ WHERE word = $q$introduce / adopt / follow a model$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to examine a possible connection, a crime or a complaint to find the facts$q$, translation = $q$điều tra một mối liên hệ / vụ việc / khiếu nại
1) Nhà khoa học điều tra mối liên hệ giữa chế độ ăn và bệnh tật.
2) Cảnh sát điều tra mọi vụ việc nghiêm trọng.
3) Công ty sẽ điều tra khiếu nại của khách hàng.$q$ WHERE word = $q$investigate a link / case / complaint$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to show or give good reasons why a war, action or cost is acceptable$q$, translation = $q$biện minh cho một cuộc chiến / hành động / khoản chi
1) Các nhà lãnh đạo cố biện minh cho cuộc chiến trước công chúng.
2) Không gì có thể biện minh cho một hành động tàn nhẫn như vậy.
3) Lợi ích biện minh cho khoản chi.$q$ WHERE word = $q$justify a war / action / expense$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$schools or branches of economics, based on Keynes, older theories, or experiments$q$, translation = $q$kinh tế học Keynes / cổ điển / thực nghiệm
1) Kinh tế học Keynes ủng hộ chi tiêu của chính phủ trong khủng hoảng.
2) Kinh tế học cổ điển tin rằng thị trường tự do tự cân bằng.
3) Kinh tế học thực nghiệm kiểm chứng lý thuyết với người tham gia thật.$q$ WHERE word = $q$Keynesian / classical / experimental economics$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change and develop gradually over time$q$, translation = $q$ngôn ngữ / công nghệ phát triển
1) Ngôn ngữ phát triển khi xã hội thay đổi.
2) Công nghệ phát triển với tốc độ đáng kinh ngạc.$q$ WHERE word = $q$language / technology evolves$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to start an organised effort or a violent assault$q$, translation = $q$phát động một chiến dịch / cuộc tấn công
1) Tổ chức từ thiện phát động chiến dịch trồng cây.
2) Quân đội phát động một cuộc tấn công lúc bình minh.$q$ WHERE word = $q$launch a campaign / an attack$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to introduce a new product, brand or book to the public$q$, translation = $q$ra mắt một sản phẩm / thương hiệu / cuốn sách
1) Công ty sẽ ra mắt một sản phẩm mới vào mùa xuân này.
2) Họ tung ra một thương hiệu mới cho người mua trẻ.
3) Tác giả ra mắt cuốn sách của mình tại một sự kiện lớn.$q$ WHERE word = $q$launch a product / brand / book$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$expected or probable to occur, produce a result, or go on$q$, translation = $q$có khả năng xảy ra / gây ra / tiếp diễn
1) Bão có khả năng xảy ra vào cuối tuần này.
2) Hút thuốc có khả năng gây ra các vấn đề sức khỏe.
3) Xu hướng này có khả năng tiếp diễn.$q$ WHERE word = $q$likely to happen / cause / continue$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$people who live in an area: those nearby, those staying long term, or those who are old$q$, translation = $q$cư dân địa phương / lâu dài / cao tuổi
1) Cư dân địa phương thích công viên mới.
2) Các căn hộ chỉ dành cho cư dân lâu dài.
3) Cư dân cao tuổi nhận được hỗ trợ thêm.$q$ WHERE word = $q$local / permanent / elderly residents$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to have a similar appearance, sound or way of thinking$q$, translation = $q$trông / nghe / nghĩ giống nhau
1) Cặp song sinh trông giống hệt nhau.
2) Hai bài hát nghe giống nhau.
3) Bạn thân thường nghĩ giống nhau.$q$ WHERE word = $q$look / sound / think alike$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$slightly higher or lower$q$, translation = $q$cao hơn / thấp hơn một chút
1) Con số năm nay cao hơn một chút.
2) Nhiệt độ thấp hơn một chút.$q$ WHERE word = $q$marginally higher / lower$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$branches of archaeology studying sunken ships, industrial remains or ancient Greece and Rome$q$, translation = $q$khảo cổ hàng hải / công nghiệp / cổ điển
1) Khảo cổ hàng hải nghiên cứu các xác tàu đắm dưới đáy biển.
2) Khảo cổ công nghiệp khám phá các nhà máy và hầm mỏ cũ.
3) Khảo cổ cổ điển tập trung vào Hy Lạp và La Mã.$q$ WHERE word = $q$maritime / industrial / classical archaeology$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the study of language in its present form, its past, or its practical use$q$, translation = $q$ngôn ngữ học hiện đại / lịch sử / ứng dụng
1) Ngôn ngữ học hiện đại nghiên cứu cách trẻ em tiếp thu ngôn ngữ.
2) Ngôn ngữ học lịch sử truy tìm cách từ ngữ thay đổi theo thời gian.
3) Ngôn ngữ học ứng dụng cải thiện cách chúng ta dạy ngôn ngữ.$q$ WHERE word = $q$modern / historical / applied linguistics$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$having good reasons or being right on moral or financial grounds$q$, translation = $q$biện minh về mặt đạo đức / kinh tế
1) Cuộc chiến không thể biện minh về mặt đạo đức.
2) Khoản đầu tư là hợp lý về mặt kinh tế.$q$ WHERE word = $q$morally / economically justified$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say firmly that you disagree with or oppose something$q$, translation = $q$Các nhóm môi trường phản đối mạnh mẽ dự án này.$q$ WHERE word = $q$object strongly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to dislike something and say or show that you disagree with it$q$, translation = $q$phản đối điều gì
Người dân địa phương phản đối kế hoạch xây sân bay mới.$q$ WHERE word = $q$object to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to disagree with or oppose an idea or the way something is used$q$, translation = $q$phản đối ý tưởng / việc sử dụng điều gì
1) Nhiều phụ huynh phản đối ý tưởng kéo dài ngày học.
2) Cư dân phản đối việc sử dụng công viên cho các sự kiện.$q$ WHERE word = $q$object to the idea / use of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to watch and study how people or animals act$q$, translation = $q$Các nhà khoa học quan sát hành vi của động vật trong tự nhiên.$q$ WHERE word = $q$observe behaviour$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$neither tall nor short; of a typical height$q$, translation = $q$có chiều cao trung bình / bình thường
1) Anh ấy là một người đàn ông có chiều cao trung bình.
2) Cây mọc đến chiều cao bình thường là một mét.
3) Cô ấy có chiều cao trung bình so với tuổi.$q$ WHERE word = $q$of medium / normal / average height$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to support or recommend an idea in a public, firm or open way$q$, translation = $q$công khai / mạnh mẽ / công khai ủng hộ
1) Cô ấy công khai ủng hộ trả lương bình đẳng.
2) Anh ấy mạnh mẽ ủng hộ năng lượng tái tạo.
3) Nhóm này công khai ủng hộ quyền động vật.$q$ WHERE word = $q$openly / strongly / publicly advocate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$given as medicine by mouth or directly into a vein$q$, translation = $q$cho dùng đường uống / đường tĩnh mạch
1) Thuốc được dùng đường uống hai lần một ngày.
2) Trong trường hợp khẩn cấp, thuốc được truyền qua đường tĩnh mạch.$q$ WHERE word = $q$orally / intravenously administered$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to plan and arrange a meeting, an event or a public protest$q$, translation = $q$tổ chức một cuộc họp / sự kiện / cuộc biểu tình
1) Cô ấy tổ chức một cuộc họp cho toàn thể nhân viên.
2) Câu lạc bộ tổ chức một sự kiện từ thiện.
3) Sinh viên tổ chức một cuộc biểu tình ôn hòa.$q$ WHERE word = $q$organise a meeting / event / demonstration$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to arrange things into groups or according to subject$q$, translation = $q$sắp xếp mọi thứ theo nhóm / chủ đề
1) Tôi sắp xếp ghi chú theo chủ đề.
2) Các tệp được sắp xếp theo nhóm.$q$ WHERE word = $q$organise things by group / topic$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be greater than disadvantages, or to deal with them successfully$q$, translation = $q$lớn hơn / khắc phục các nhược điểm
1) Lợi ích rõ ràng lớn hơn các nhược điểm.
2) Lập kế hoạch cẩn thận có thể khắc phục những nhược điểm này.$q$ WHERE word = $q$outweigh / overcome drawbacks$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the total amount of money spent or earned$q$, translation = $q$tổng chi tiêu / doanh thu
1) Tổng chi tiêu tăng vào năm ngoái.
2) Tổng doanh thu giảm nhẹ.$q$ WHERE word = $q$overall spending / revenue$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to succeed in dealing with a problem, difficulty or obstacle$q$, translation = $q$vượt qua một vấn đề / khó khăn / trở ngại
1) Bằng nỗ lực, cô ấy vượt qua mọi vấn đề trên đường.
2) Anh ấy vượt qua khó khăn lớn để hoàn thành cuộc đua.
3) Người quyết tâm vượt qua mọi trở ngại.$q$ WHERE word = $q$overcome a problem / difficulty / obstacle$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal successfully with an injury or being behind in score$q$, translation = $q$vượt qua một chấn thương / sự thua kém
1) Vận động viên đã nỗ lực để vượt qua chấn thương.
2) Đội bóng lội ngược dòng từ thế thua hai bàn để chiến thắng.$q$ WHERE word = $q$overcome an injury / deficit$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to take part in something in an equal, willing or effective manner$q$, translation = $q$tham gia bình đẳng / sẵn lòng / hiệu quả
1) Cả hai bên nên tham gia một cách bình đẳng.
2) Bọn trẻ tham gia một cách sẵn lòng.
3) Để tham gia hiệu quả, bạn phải chuẩn bị.$q$ WHERE word = $q$participate equally / willingly / effectively$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to take part in a talk, an activity or an argument$q$, translation = $q$tham gia một cuộc thảo luận / hoạt động / tranh luận
1) Sinh viên được khuyến khích tham gia thảo luận.
2) Mọi người đều có thể tham gia hoạt động.
3) Cô ấy tham gia tranh luận một cách tự tin.$q$ WHERE word = $q$participate in a discussion / activity / debate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$especially or more than usually helpful, significant or connected$q$, translation = $q$đặc biệt hữu ích / quan trọng / liên quan
1) Mẹo này đặc biệt hữu ích cho người mới.
2) Giấc ngủ đặc biệt quan trọng với trẻ em.
3) Ví dụ này đặc biệt liên quan ở đây.$q$ WHERE word = $q$particularly useful / important / relevant$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$more easily harmed, or more worried, than others$q$, translation = $q$đặc biệt dễ bị tổn thương / lo ngại
1) Người cao tuổi đặc biệt dễ bị ảnh hưởng bởi nắng nóng.
2) Phụ huynh đặc biệt lo ngại về vấn đề an toàn.$q$ WHERE word = $q$particularly vulnerable / concerned$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to settle a problem or dispute without violence or bad feeling$q$, translation = $q$giải quyết điều gì một cách ôn hòa / êm đẹp
1) Những người hàng xóm giải quyết tranh cãi một cách ôn hòa.
2) Các công ty giải quyết vấn đề một cách êm đẹp.$q$ WHERE word = $q$peacefully / amicably resolve something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$entirely, or equally, reasonable and acceptable$q$, translation = $q$hoàn toàn / cũng hợp lý như nhau
1) Cả hai ý kiến đều hoàn toàn hợp lý.
2) Mối lo ngại của cô ấy cũng hợp lý như vậy.$q$ WHERE word = $q$perfectly / equally valid$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$new, groundbreaking work, operations or research that leads the way for others$q$, translation = $q$công trình / phẫu thuật / nghiên cứu tiên phong
1) Công trình tiên phong của bà đã thay đổi y học.
2) Bác sĩ thực hiện một ca phẫu thuật tiên phong.
3) Phòng thí nghiệm nổi tiếng với nghiên cứu tiên phong.$q$ WHERE word = $q$pioneering work / surgery / research$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the study of planets, of theory, or of the present day in the science of stars and space$q$, translation = $q$thiên văn hành tinh / lý thuyết / hiện đại
1) Thiên văn hành tinh nghiên cứu các hành tinh trong hệ mặt trời.
2) Thiên văn lý thuyết phụ thuộc nhiều vào toán học.
3) Thiên văn hiện đại dựa vào các kính viễn vọng không gian mạnh mẽ.$q$ WHERE word = $q$planetary / theoretical / modern astronomy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create, confront or find a way out of a hard choice between two options$q$, translation = $q$đặt ra / đối mặt / giải quyết một thế lưỡng nan
1) Công nghệ mới đặt ra một thế lưỡng nan khó khăn.
2) Phụ huynh thường đối mặt với tình thế lưỡng nan này.
3) Không dễ để giải quyết một thế lưỡng nan như vậy.$q$ WHERE word = $q$pose / face / solve a dilemma$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say that something will increase, decrease or get better in the future$q$, translation = $q$dự đoán một sự tăng / giảm / phục hồi
1) Các nhà kinh tế dự đoán giá sẽ tăng.
2) Chuyên gia dự đoán doanh số sẽ giảm.
3) Ngân hàng dự đoán một sự phục hồi chậm.$q$ WHERE word = $q$predict a rise / decline / recovery$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say what will happen in a particular event or result before it occurs$q$, translation = $q$dự đoán một sự kiện / kết quả
1) Không ai có thể dự đoán một sự kiện như động đất.
2) Các chuyên gia cố dự đoán kết quả của cuộc bầu cử.$q$ WHERE word = $q$predict an event / outcome$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create, take on, deal with or successfully handle something difficult to do$q$, translation = $q$đặt ra / chấp nhận / đối mặt / vượt qua thử thách
1) Biến đổi khí hậu đặt ra một thử thách to lớn cho thế giới.
2) Cô ấy vui vẻ chấp nhận thử thách.
3) Mỗi du khách phải đối mặt với thử thách của một nền văn hóa mới.
4) Đội đã vượt qua thử thách và thành công.$q$ WHERE word = $q$present / pose / accept / face / meet a challenge$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to stop, fight against or cure an illness caused by germs$q$, translation = $q$ngăn ngừa / chống lại / điều trị nhiễm trùng
1) Rửa tay giúp ngăn ngừa nhiễm trùng.
2) Hệ miễn dịch của cơ thể chống lại nhiễm trùng.
3) Bác sĩ điều trị nhiễm trùng bằng kháng sinh.$q$ WHERE word = $q$prevent / combat / treat an infection$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to stop, give medical care for, or heal an illness$q$, translation = $q$phòng ngừa / điều trị / chữa khỏi bệnh
1) Vắc-xin giúp phòng ngừa nhiều bệnh nghiêm trọng.
2) Bác sĩ giờ có thể điều trị bệnh bằng thuốc mới.
3) Các nhà khoa học hy vọng một ngày sẽ chữa khỏi bệnh.$q$ WHERE word = $q$prevent / treat / cure a disease$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$agreement, permission or consent that must be obtained in advance$q$, translation = $q$sự chấp thuận / cho phép / đồng ý trước
1) Bạn cần được chấp thuận trước để nghỉ phép.
2) Khách phải xin phép trước để vào.
3) Dữ liệu được dùng mà không có sự đồng ý trước.$q$ WHERE word = $q$prior approval / permission / consent$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$things known or experienced before$q$, translation = $q$kiến thức / kinh nghiệm trước đó
1) Khóa học không đòi hỏi kiến thức trước đó.
2) Kinh nghiệm trước đó là một lợi thế cho công việc này.$q$ WHERE word = $q$prior knowledge / experience$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$official documents showing who you are or where you live$q$, translation = $q$bằng chứng về danh tính / nơi cư trú
1) Bạn phải xuất trình bằng chứng danh tính để bỏ phiếu.
2) Ngân hàng yêu cầu bằng chứng về nơi cư trú.$q$ WHERE word = $q$proof of identity / residency$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to turn out to be, or become, extremely important to the result$q$, translation = $q$trở nên / chứng tỏ là then chốt
1) Quyết định duy nhất đó hóa ra lại mang tính then chốt cho chiến thắng.
2) Bằng chứng mới trở nên mấu chốt trong vụ án.$q$ WHERE word = $q$prove / become pivotal$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to turn out to be useful or worth a lot$q$, translation = $q$trở nên / chứng tỏ có giá trị
1) Những kỹ năng này sẽ chứng tỏ giá trị trong sự nghiệp của bạn.
2) Tấm bản đồ cũ trở nên quý giá với các nhà sử học.$q$ WHERE word = $q$prove / become valuable$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$agreed, accepted or arranged for now, but likely to change$q$, translation = $q$được tạm đồng ý / chấp nhận / lên lịch
1) Thỏa thuận được tạm đồng ý.
2) Bài báo của cô ấy được tạm chấp nhận.
3) Cuộc họp tạm được lên lịch vào tháng Năm.$q$ WHERE word = $q$provisionally agreed / accepted / scheduled$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause a particular feeling, answer or discussion in people$q$, translation = $q$gây ra một phản ứng / hồi đáp / cuộc tranh luận
1) Quảng cáo gây ra một phản ứng mạnh mẽ.
2) Bài phát biểu gây ra một phản ứng giận dữ.
3) Báo cáo làm dấy lên một cuộc tranh luận toàn quốc.$q$ WHERE word = $q$provoke a reaction / response / debate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause strong anger, shock or disagreement$q$, translation = $q$khơi dậy sự phẫn nộ / tức giận / tranh cãi
1) Quyết định này khơi dậy sự phẫn nộ của công chúng.
2) Lời nói thô lỗ của anh ta gây ra sự tức giận.
3) Bộ phim gây tranh cãi.$q$ WHERE word = $q$provoke outrage / anger / controversy$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to doubt whether something is sound, correct or allowed by law$q$, translation = $q$đặt nghi vấn về tính hợp lệ / hợp pháp của điều gì
1) Các nhà phê bình đặt nghi vấn về tính hợp lệ của nghiên cứu.
2) Luật sư chất vấn tính hợp pháp của quyết định.$q$ WHERE word = $q$question the validity / legality of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to doubt whether someone's judgement or reasons are good$q$, translation = $q$nghi ngờ sự khôn ngoan / động cơ của ai
1) Nhiều người nghi ngờ sự khôn ngoan của việc cắt giảm ngân sách.
2) Người ta bắt đầu nghi ngờ động cơ của anh ta.$q$ WHERE word = $q$question the wisdom / motives of someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$willing to accept people of other races or ethnic groups$q$, translation = $q$khoan dung về sắc tộc
Các thành phố lớn thường khoan dung về sắc tộc hơn so với các thị trấn nhỏ.$q$ WHERE word = $q$racially tolerant$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change something completely and at its basic level$q$, translation = $q$thay đổi điều gì một cách triệt để / căn bản
1) Internet đã thay đổi triệt để cách giao tiếp.
2) Cuộc cải cách đã thay đổi căn bản hệ thống.$q$ WHERE word = $q$radically / fundamentally alter something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to become worse, quickly or little by little$q$, translation = $q$xấu đi nhanh chóng / dần dần
1) Sức khỏe của cô ấy nhanh chóng xấu đi.
2) Đường sá dần xuống cấp qua các năm.$q$ WHERE word = $q$rapidly / steadily deteriorate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to arrive at, create or achieve agreement among a group$q$, translation = $q$đạt được / xây dựng một sự đồng thuận
1) Ủy ban cuối cùng đã đạt được sự đồng thuận.
2) Nhà lãnh đạo giỏi xây dựng sự đồng thuận trước khi hành động.
3) Phải mất nhiều giờ để đạt được sự đồng thuận.$q$ WHERE word = $q$reach / build / achieve a consensus$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to grow or rise until something is a particular height$q$, translation = $q$đạt tới độ cao x
Tòa tháp đạt độ cao 300 mét.$q$ WHERE word = $q$reach a height of x$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to enjoy the good results of something you did or that happened earlier$q$, translation = $q$gặt hái lợi ích của điều gì
Những ai học chăm chỉ bây giờ sẽ gặt hái lợi ích về sau.$q$ WHERE word = $q$reap the benefit of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$fairly or correct in terms of facts$q$, translation = $q$tương đối / về mặt dữ kiện là chính xác
1) Bản đồ tương đối chính xác.
2) Bài báo chính xác về mặt dữ kiện.$q$ WHERE word = $q$reasonably / factually accurate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say poems aloud from memory, read them or repeat lines from them$q$, translation = $q$ngâm / đọc / trích dẫn thơ
1) Trẻ em ngâm thơ tại buổi hòa nhạc của trường.
2) Tôi thích đọc thơ trước khi ngủ.
3) Anh ấy thường trích dẫn thơ trong các bài phát biểu.$q$ WHERE word = $q$recite / read / quote poetry$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make an existing idea, opinion or belief stronger$q$, translation = $q$củng cố một nhận thức / quan điểm / niềm tin
1) Truyền thông có thể củng cố một nhận thức tiêu cực.
2) Kết quả củng cố quan điểm của tôi về tập thể dục.
3) Những câu chuyện như vậy củng cố một niềm tin phổ biến.$q$ WHERE word = $q$reinforce a perception / view / belief$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to make a fixed, oversimplified belief or a message stronger$q$, translation = $q$củng cố một định kiến / thông điệp
1) Phim hoạt hình đôi khi củng cố một định kiến.
2) Sự lặp lại củng cố thông điệp chính.$q$ WHERE word = $q$reinforce a stereotype / message$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$fairly easy, cheap or recent, compared with others$q$, translation = $q$tương đối dễ / rẻ / gần đây
1) Bài thi tương đối dễ.
2) Vé máy bay tương đối rẻ.
3) Luật được thông qua tương đối gần đây.$q$ WHERE word = $q$relatively easy / cheap / recently$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$small, low or short when compared with something else$q$, translation = $q$tương đối nhỏ / thấp / ngắn
1) Rủi ro là tương đối nhỏ.
2) Chi phí tương đối thấp.
3) Hành trình tương đối ngắn.$q$ WHERE word = $q$relatively small / low / short$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be a sign of or stand for a difference, rise or change$q$, translation = $q$thể hiện một sự khác biệt / gia tăng / thay đổi
1) Mỗi màu thể hiện một sự khác biệt về thu nhập.
2) Đường biểu diễn thể hiện sự gia tăng doanh số.
3) Mũi tên thể hiện một sự thay đổi trong chính sách.$q$ WHERE word = $q$represent a difference / increase / shift$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal successfully with a crisis, or to have to deal with one$q$, translation = $q$giải quyết / đối mặt với khủng hoảng
1) Các nhà lãnh đạo hợp tác để giải quyết khủng hoảng.
2) Chính phủ phải đối mặt với một cuộc khủng hoảng nghiêm trọng.$q$ WHERE word = $q$resolve / face a crisis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to find a solution to an argument, conflict or problem$q$, translation = $q$giải quyết một tranh chấp / xung đột / vấn đề
1) Hai bên giải quyết tranh chấp thông qua đàm phán.
2) Ngoại giao đã giúp giải quyết xung đột.
3) Chúng tôi giải quyết vấn đề trong một ngày.$q$ WHERE word = $q$resolve a dispute / conflict / issue$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be caused by use, by something failing or by something missing$q$, translation = $q$bắt nguồn từ việc sử dụng / một sự thất bại / sự thiếu hụt
1) Nhiều tai nạn bắt nguồn từ việc sử dụng bất cẩn.
2) Vấn đề bắt nguồn từ việc không lập kế hoạch.
3) Bệnh tật có thể bắt nguồn từ sự thiếu hụt vitamin.$q$ WHERE word = $q$result from use / a failure / lack$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause a particular outcome such as a decrease, gain or drop$q$, translation = $q$dẫn đến sự thua lỗ / gia tăng / sụt giảm
1) Cuộc đình công dẫn đến khoản lỗ lớn.
2) Chiến dịch dẫn đến sự gia tăng doanh số.
3) Phương pháp mới giúp giảm bớt rác thải.$q$ WHERE word = $q$result in a loss / increase / reduction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to check people or things regularly, or carefully, for illness or danger$q$, translation = $q$sàng lọc thường quy / đúng cách
1) Sân bay sàng lọc hành khách một cách thường quy để bảo đảm an ninh.
2) Máu hiến phải được sàng lọc đúng cách.$q$ WHERE word = $q$routinely / properly screen$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to test people for signs of a disease or condition before symptoms appear$q$, translation = $q$tầm soát một bệnh / tình trạng
1) Khám định kỳ giúp tầm soát bệnh trước khi triệu chứng xuất hiện.
2) Bác sĩ tầm soát bất kỳ tình trạng nào có tính di truyền trong gia đình.$q$ WHERE word = $q$screen for a disease / condition$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to test someone for a disease or condition, often before symptoms show$q$, translation = $q$sàng lọc ai đó để tìm bệnh gì
Các bệnh viện hiện sàng lọc trẻ sơ sinh để phát hiện vấn đề thính giác.$q$ WHERE word = $q$screen someone for something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$altered in a way that depends on the season, a machine or by hand$q$, translation = $q$được điều chỉnh theo mùa / tự động / thủ công
1) Dữ liệu được điều chỉnh theo mùa để có thể so sánh.
2) Hệ thống được điều chỉnh tự động vào ban đêm.
3) Ghế có thể được điều chỉnh thủ công.$q$ WHERE word = $q$seasonally / automatically / manually adjusted$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to win or obtain something successfully after effort$q$, translation = $q$giành được chiến thắng / suất / thỏa thuận
1) Đội giành chiến thắng ở phút cuối.
2) Cô ấy giành được một suất vào trường đại học hàng đầu.
3) Công ty giành được một thỏa thuận lớn ở nước ngoài.$q$ WHERE word = $q$secure a victory / place / deal$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to obtain money or peace that is safe and certain$q$, translation = $q$bảo đảm nguồn tài trợ / hòa bình
1) Trường học bảo đảm được nguồn tài trợ cho máy tính mới.
2) Hiệp ước giúp bảo đảm hòa bình cho khu vực.$q$ WHERE word = $q$secure funding / peace$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to obtain someone's agreement or backing$q$, translation = $q$giành được sự chấp thuận / ủng hộ của ai
1) Kế hoạch giành được sự chấp thuận của hội đồng.
2) Nhà lãnh đạo giành được sự ủng hộ của cử tri.$q$ WHERE word = $q$secure the approval / support of someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to ask for consent, authorization or money for harm suffered$q$, translation = $q$tìm kiếm sự chấp thuận / cho phép / bồi thường
1) Bạn phải xin chấp thuận trước khi bắt đầu dự án.
2) Du khách xin phép để vào khu bảo tồn.
3) Các nạn nhân đòi bồi thường từ công ty.$q$ WHERE word = $q$seek approval / permission / compensation$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to ask for or look for assistance, advice, protection or medical care$q$, translation = $q$tìm kiếm sự giúp đỡ / lời khuyên / nơi trú ẩn / điều trị
1) Đừng ngại tìm sự giúp đỡ khi bạn gặp khó khăn.
2) Cô ấy tìm lời khuyên từ một giáo viên giàu kinh nghiệm.
3) Hàng nghìn người tìm nơi trú ẩn khỏi lũ lụt.
4) Anh ấy tìm cách điều trị chứng đau lưng.$q$ WHERE word = $q$seek help / advice / refuge / treatment$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$unwanted, often lasting consequences of an action, which may be serious, possible or harmful$q$, translation = $q$những hệ lụy nghiêm trọng / tiềm tàng / tiêu cực
1) Quyết định này gây ra những hệ lụy nghiêm trọng.
2) Kế hoạch mang theo những hệ lụy tiềm tàng.
3) Vụ bê bối gây hệ lụy tiêu cực cho công ty.$q$ WHERE word = $q$serious / potential / negative repercussions$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$very bad, harsh or unplanned results of an action$q$, translation = $q$hậu quả nghiêm trọng / nặng nề / không lường trước
1) Ô nhiễm gây ra những hậu quả nghiêm trọng cho sức khỏe.
2) Chính sách gây hậu quả nặng nề cho nông dân.
3) Sự thay đổi mang lại những hậu quả không lường trước.$q$ WHERE word = $q$serious / severe / unintended consequences$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a serious, light or very dangerous loss of body water$q$, translation = $q$mất nước nghiêm trọng / nhẹ / cực độ
1) Mất nước nghiêm trọng có thể cần điều trị tại bệnh viện.
2) Ngay cả mất nước nhẹ cũng có thể gây đau đầu.
3) Mất nước cực độ rất nguy hiểm với trẻ nhỏ.$q$ WHERE word = $q$severe / mild / extreme dehydration$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to move one's body weight or position from one place to another$q$, translation = $q$đổi tư thế / vị trí
1) Anh ấy đổi trọng tâm từ chân này sang chân kia.
2) Cô ấy đổi vị trí để nhìn rõ hơn.$q$ WHERE word = $q$shift one's weight / position$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change what is most important, stressed or balanced$q$, translation = $q$chuyển trọng tâm / sự nhấn mạnh / cán cân
1) Báo cáo chuyển trọng tâm sang các vùng nông thôn.
2) Trường học nên chuyển sự nhấn mạnh sang kỹ năng.
3) Sự thay đổi đã dịch chuyển cán cân quyền lực.$q$ WHERE word = $q$shift the focus / emphasis / balance$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$competition and jealousy between brothers and sisters$q$, translation = $q$sự ganh đua giữa anh chị em
Sự ganh đua giữa anh chị em rất phổ biến khi các con xấp xỉ tuổi nhau.$q$ WHERE word = $q$sibling rivalry 2$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$changed to a noticeable or large degree$q$, translation = $q$được sửa đổi đáng kể / sâu rộng
1) Thiết kế đã được sửa đổi đáng kể.
2) Kế hoạch ban đầu được sửa đổi sâu rộng.$q$ WHERE word = $q$significantly / extensively modified$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be told by a doctor that one has a particular illness$q$, translation = $q$ai đó được chẩn đoán mắc bệnh gì
Anh ấy được chẩn đoán mắc tiểu đường sau một lần khám định kỳ.$q$ WHERE word = $q$someone is diagnosed with something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$something runs or reaches along the whole length of something else$q$, translation = $q$vật gì kéo dài suốt chiều dài của vật gì
1) Bãi biển trải dài suốt vịnh.
2) Một bức tường kéo dài hết chiều dài khu vườn.$q$ WHERE word = $q$something stretches / extends the length of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause or start a debate$q$, translation = $q$khơi mào / châm ngòi cho một cuộc tranh luận
1) Bài báo khơi mào một cuộc tranh luận toàn quốc.
2) Lời bình luận của anh ta châm ngòi một cuộc tranh luận dữ dội.
3) Luật mới làm bùng lên một cuộc tranh luận công khai.$q$ WHERE word = $q$spark / provoke / trigger a debate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say something clearly in speech or writing, such as a fact, reason or wish$q$, translation = $q$nêu một sự thật / lý do / sở thích
1) Báo cáo chỉ nêu một sự thật.
2) Vui lòng nêu lý do vắng mặt.
3) Khách hàng có thể nêu thời gian giao hàng mong muốn.$q$ WHERE word = $q$state a fact / reason / preference$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to say something in a clear, direct and definite way$q$, translation = $q$nêu rõ ràng / một cách dứt khoát
1) Các quy tắc nêu rõ điều gì được phép.
2) Hợp đồng nêu dứt khoát thời hạn.$q$ WHERE word = $q$state clearly / explicitly$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to fall in amount, gradually, quickly or by a lot$q$, translation = $q$suy giảm đều đặn / nhanh chóng / mạnh
1) Số người tham dự giảm đều trong cả năm.
2) Lợi nhuận giảm nhanh sau vụ bê bối.
3) Nhu cầu giảm mạnh trong quý vừa rồi.$q$ WHERE word = $q$steadily / rapidly / sharply decline$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to have something as its origin or cause$q$, translation = $q$bắt nguồn từ điều gì
Sự tự tin của cô ấy bắt nguồn từ nhiều năm luyện tập.$q$ WHERE word = $q$stem from something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to indicate something in a strong or cautious, uncertain way$q$, translation = $q$cho thấy rõ rệt / một cách dè dặt
1) Kết quả cho thấy rõ rệt một sự liên hệ.
2) Dữ liệu ban đầu gợi ý một cách dè dặt về sự cải thiện.$q$ WHERE word = $q$strongly / tentatively suggest$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to experience, deal with or accept the results of an action$q$, translation = $q$gánh chịu / đối mặt / chấp nhận hậu quả
1) Các thế hệ tương lai sẽ gánh chịu hậu quả.
2) Anh ấy phải đối mặt với hậu quả của lựa chọn của mình.
3) Bạn phải chấp nhận hậu quả của hành động của mình.$q$ WHERE word = $q$suffer / face / accept the consequences$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to have a sudden loss of blood supply to the brain, or to avoid it$q$, translation = $q$bị / lên cơn / phòng ngừa đột quỵ
1) Ông ấy bị đột quỵ ở tuổi sáu mươi.
2) Cô ấy lên cơn đột quỵ nhưng đã hồi phục hoàn toàn.
3) Kiểm soát huyết áp giúp phòng ngừa đột quỵ.$q$ WHERE word = $q$suffer / have / prevent a stroke$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$hanging from a ceiling or hook$q$, translation = $q$được treo từ trần nhà / móc
1) Một chiếc đèn được treo từ trần nhà.
2) Các dụng cụ được treo trên một cái móc trên tường.$q$ WHERE word = $q$suspended from a ceiling / hook$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal with, avoid or lower the problem of being seriously overweight$q$, translation = $q$giải quyết / ngăn ngừa / giảm béo phì
1) Các chính phủ đang cố giải quyết béo phì thông qua giáo dục.
2) Chế độ ăn cân bằng giúp ngăn ngừa béo phì.
3) Vận động nhiều hơn có thể giảm béo phì ở trẻ em.$q$ WHERE word = $q$tackle / prevent / reduce obesity$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to try to deal with a difficult problem, matter or job$q$, translation = $q$giải quyết một vấn đề / khía cạnh / nhiệm vụ
1) Thành phố đang cố giải quyết vấn đề rác thải.
2) Chúng ta cần cùng nhau giải quyết khía cạnh này.
3) Cô ấy đương đầu với nhiệm vụ khó khăn một cách bình tĩnh.$q$ WHERE word = $q$tackle a problem / issue / task$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal firmly with crime or corruption in order to reduce it$q$, translation = $q$đẩy lùi tội phạm / tham nhũng
1) Thêm cảnh sát được tuyển để đẩy lùi tội phạm.
2) Luật mới nhằm đẩy lùi tham nhũng.$q$ WHERE word = $q$tackle crime / corruption$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to travel along, or decide on, a particular way to a place$q$, translation = $q$đi theo / chọn một tuyến đường
1) Chúng tôi đi một tuyến khác để tránh kẹt xe.
2) Cứ theo tuyến đường này cho đến khi tới con sông.
3) Người đi bộ đường dài có thể chọn một tuyến dễ hơn.$q$ WHERE word = $q$take / follow / choose a route$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to stop something for a short or unlimited time$q$, translation = $q$tạm thời / vô thời hạn đình chỉ điều gì
1) Dịch vụ tạm thời bị ngừng để sửa chữa.
2) Các chuyến bay bị đình chỉ vô thời hạn sau cơn bão.$q$ WHERE word = $q$temporarily / indefinitely suspend something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to check, back up or prove an idea that has been proposed$q$, translation = $q$kiểm chứng / ủng hộ / xác nhận một giả thuyết
1) Các thí nghiệm được thiết kế để kiểm chứng một giả thuyết.
2) Kết quả ủng hộ giả thuyết ban đầu.
3) Dữ liệu sâu hơn đã xác nhận giả thuyết.$q$ WHERE word = $q$test / support / confirm a hypothesis$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the good or advantage that something gives$q$, translation = $q$lợi ích của điều gì
Nhiều học sinh đánh giá thấp lợi ích của việc đọc sách thường xuyên.$q$ WHERE word = $q$the benefit of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the distance around a circle or round object$q$, translation = $q$chu vi của vật gì
Các nhà khoa học đã đo chu vi Trái Đất từ lâu.$q$ WHERE word = $q$the circumference of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the idea of being free, of rule by the people, or of fairness$q$, translation = $q$khái niệm về tự do / dân chủ / công lý
1) Bài luận khám phá khái niệm về tự do.
2) Trẻ em dần học khái niệm về dân chủ.
3) Cuốn sách bàn về khái niệm công lý.$q$ WHERE word = $q$the concept of freedom / democracy / justice$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the results or effects of war, an action or a failure$q$, translation = $q$hậu quả của chiến tranh / hành động / thất bại
1) Hậu quả của chiến tranh kéo dài qua nhiều thế hệ.
2) Mọi hành động đều có hậu quả, tốt hoặc xấu.
3) Hậu quả của thất bại đã dạy cô ấy thử lại lần nữa.$q$ WHERE word = $q$the consequences of war / action / failure$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the whole length of something, from one end to the other$q$, translation = $q$toàn bộ / trọn / tổng chiều dài của vật gì
1) Chúng tôi đi bộ suốt toàn bộ con đường mòn.
2) Trọn chiều dài con sông đã được vẽ bản đồ.
3) Tổng chiều dài của đoàn tàu là 200 mét.$q$ WHERE word = $q$the entire / full / overall length of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$something equal in value, amount or meaning to something else$q$, translation = $q$tương đương với điều gì
Anh ấy kiếm được số tiền tương đương lương của một giáo viên.$q$ WHERE word = $q$the equivalent of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the line of seats or people nearest to or furthest from the front$q$, translation = $q$hàng trước / hàng sau
1) Học sinh ở hàng đầu trả lời trước.
2) Anh ấy thích ngồi ở hàng cuối.$q$ WHERE word = $q$the front / back row$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the structure and rocks of the earth in a particular place, or the study of them$q$, translation = $q$địa chất của một nơi nào đó
Các nhà khoa học đang nghiên cứu địa chất của đáy đại dương.$q$ WHERE word = $q$the geology of somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the rocks and physical structure of a particular place$q$, translation = $q$địa chất của khu vực / vùng / hòn đảo
1) Địa chất của khu vực giải thích cho các mỏ khoáng sản giàu có.
2) Địa chất của vùng thu hút nhiều nhà nghiên cứu.
3) Địa chất của hòn đảo được hình thành bởi núi lửa.$q$ WHERE word = $q$the geology of the area / region / island$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the people who live in a particular place$q$, translation = $q$cư dân của một nơi nào đó
Cư dân của ngôi làng sống dựa vào nông nghiệp.$q$ WHERE word = $q$the inhabitants of somewhere$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the early parts or first outcomes of a process$q$, translation = $q$các giai đoạn / kết quả ban đầu
1) Dự án vẫn đang ở giai đoạn ban đầu.
2) Kết quả ban đầu trông đầy hứa hẹn.$q$ WHERE word = $q$the initial stages / results$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the ten years just gone by, or the ten years to come$q$, translation = $q$thập kỷ vừa qua / tới
1) Thành phố đã phát triển mạnh trong thập kỷ vừa qua.
2) Công nghệ sẽ thay đổi nhiều trong thập kỷ tới.$q$ WHERE word = $q$the last / next decade$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the second or last of two things just mentioned, or a later stage or part$q$, translation = $q$giai đoạn / phần / nhóm sau
1) Những sai lầm xảy ra ở giai đoạn sau của trận đấu.
2) Phần sau của cuốn sách là hay nhất.$q$ WHERE word = $q$the latter stage / part / category$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the measurement of something from one end to the other$q$, translation = $q$chiều dài của vật gì
Chiều dài của cây cầu gần hai ki-lô-mét.$q$ WHERE word = $q$the length of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the biggest disadvantage or negative aspect of something$q$, translation = $q$nhược điểm chính / lớn
1) Nhược điểm chính của kế hoạch là chi phí.
2) Một nhược điểm lớn là thiếu chỗ đậu xe.$q$ WHERE word = $q$the main / major drawback$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the greatest or smallest size from bottom to top allowed or possible$q$, translation = $q$độ cao tối đa / tối thiểu
1) Độ cao tối đa của tòa nhà được luật quy định.
2) Có một chiều cao tối thiểu cho trò chơi này.$q$ WHERE word = $q$the maximum / minimum height$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$muscles or heart chambers tighten and become shorter$q$, translation = $q$các cơ / tâm thất co lại
1) Các cơ co lại để làm xương cử động.
2) Tâm thất của tim co lại để bơm máu.$q$ WHERE word = $q$the muscles / ventricles contract$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the widespread problem of too many people being very overweight, or its level$q$, translation = $q$nạn dịch / tỉ lệ / vấn đề béo phì
1) Nạn dịch béo phì đang gây áp lực lên hệ thống y tế.
2) Tỉ lệ béo phì đã tăng gấp đôi trong hai thập kỷ.
3) Đồ ăn nhanh góp phần vào vấn đề béo phì.$q$ WHERE word = $q$the obesity epidemic / rate / problem$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the result or effect of an action, event or process$q$, translation = $q$kết quả của điều gì
Không ai có thể đoán trước kết quả của cuộc bầu cử.$q$ WHERE word = $q$the outcome of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a person's mother and father$q$, translation = $q$cha mẹ của ai đó
Cha mẹ của trẻ nhỏ thường khó tìm được thời gian cho bản thân.$q$ WHERE word = $q$the parents of someone$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$a very large quantity or amount of something$q$, translation = $q$khối lượng khổng lồ / lớn / cao
1) Khối lượng công việc khổng lồ thật quá sức.
2) Một lượng rác lớn cuối cùng trôi ra biển.
3) Doanh số bán cao khiến mọi người ngạc nhiên.$q$ WHERE word = $q$the sheer / huge / high volume$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the study of society and social behaviour in relation to religion or science$q$, translation = $q$xã hội học về tôn giáo / khoa học
1) Xã hội học về tôn giáo xem xét cách niềm tin định hình xã hội.
2) Xã hội học về khoa học nghiên cứu cách nghiên cứu được tài trợ.$q$ WHERE word = $q$the sociology of religion / science$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the amount of vehicles or information that moves through a place$q$, translation = $q$lưu lượng giao thông / dữ liệu
1) Lưu lượng giao thông tăng gấp đôi vào giờ cao điểm.
2) Lượng dữ liệu trực tuyến tăng lên mỗi năm.$q$ WHERE word = $q$the volume of traffic / data$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the measurement of how wide something is from side to side$q$, translation = $q$chiều rộng của vật gì
Chiều rộng của con đường quá hẹp cho hai xe.$q$ WHERE word = $q$the width of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to examine something carefully and in a proper, complete way$q$, translation = $q$điều tra kỹ lưỡng / đúng cách
1) Vụ tai nạn phải được điều tra kỹ lưỡng.
2) Mọi tuyên bố nên được điều tra đúng cách.$q$ WHERE word = $q$thoroughly / properly investigate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$willing to accept things or people that are different without complaint$q$, translation = $q$khoan dung / chấp nhận điều gì
Chúng ta nên khoan dung hơn với những người khác mình.$q$ WHERE word = $q$tolerant of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$too many vehicles on the roads, causing slow movement or blockages$q$, translation = $q$tắc nghẽn giao thông / đường sá
1) Tắc nghẽn giao thông làm lãng phí hàng giờ thời gian của người dân.
2) Tắc đường nghiêm trọng nhất vào giờ cao điểm.$q$ WHERE word = $q$traffic / road congestion$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to change completely the character or appearance of a country, business or area$q$, translation = $q$biến đổi một đất nước / doanh nghiệp / khu vực
1) Công nghệ đã biến đổi đất nước trong một thập kỷ.
2) Ban lãnh đạo mới đã thay đổi hoàn toàn doanh nghiệp.
3) Đầu tư đã biến đổi toàn bộ khu vực.$q$ WHERE word = $q$transform a country / business / area$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to pass on, catch or begin to suffer from an illness$q$, translation = $q$lây truyền / mắc / phát triển bệnh
1) Muỗi có thể truyền bệnh cho con người.
2) Bạn có thể mắc bệnh từ nguồn nước ô nhiễm.
3) Không tập thể dục, người ta có thể mắc bệnh sớm hơn.$q$ WHERE word = $q$transmit / contract / develop a disease$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the basic systems and structures for transport, railways or security$q$, translation = $q$hạ tầng giao thông / đường sắt / an ninh
1) Hạ tầng giao thông tốt thu hút doanh nghiệp.
2) Quốc gia đang nâng cấp hạ tầng đường sắt.
3) Sân bay dựa vào hạ tầng an ninh vững chắc.$q$ WHERE word = $q$transport / rail / security infrastructure$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to start a series of events in which each one causes the next$q$, translation = $q$kích hoạt / châm ngòi một phản ứng dây chuyền
1) Một sự cố nhỏ đã kích hoạt một phản ứng dây chuyền.
2) Tin tức đó châm ngòi một phản ứng dây chuyền trên thị trường.$q$ WHERE word = $q$trigger / set off a chain reaction$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause a crisis, war or argument to start suddenly$q$, translation = $q$làm bùng phát một cuộc khủng hoảng / chiến tranh / tranh luận
1) Sự sụp đổ làm bùng phát một cuộc khủng hoảng tài chính.
2) Vụ việc làm bùng nổ một cuộc chiến.
3) Đề xuất làm dấy lên một cuộc tranh luận gay gắt.$q$ WHERE word = $q$trigger a crisis / war / debate$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to cause a huge wave, a fall of earth or a mass of snow to start$q$, translation = $q$gây ra một trận sóng thần / lở đất / lở tuyết
1) Trận động đất gây ra một trận sóng thần.
2) Mưa lớn gây ra một vụ lở đất.
3) Tiếng ồn gây ra một trận lở tuyết.$q$ WHERE word = $q$trigger a tsunami / landslide / avalanche$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$the uncontrolled spread of cities, the rebuilding of areas or the organised design of towns$q$, translation = $q$sự bành trướng đô thị / cải tạo / quy hoạch đô thị
1) Sự bành trướng đô thị nuốt chửng đất nông nghiệp.
2) Việc cải tạo đô thị đã hồi sinh khu bến tàu cũ.
3) Quy hoạch đô thị tốt khiến thành phố đáng sống.$q$ WHERE word = $q$urban sprawl / renewal / planning$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to deal with a problem quickly or in a straightforward way$q$, translation = $q$giải quyết điều gì khẩn cấp / trực tiếp
1) Cuộc khủng hoảng phải được giải quyết khẩn cấp.
2) Bài phát biểu giải quyết trực tiếp lời chỉ trích.$q$ WHERE word = $q$urgently / directly address something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$given a vaccine to protect against a particular disease$q$, translation = $q$tiêm phòng sởi / cúm / dại
1) Trẻ em được tiêm phòng sởi khi còn nhỏ.
2) Người cao tuổi được tiêm phòng cúm mỗi mùa đông.
3) Người nuôi thú cưng cho chó của họ tiêm phòng dại.$q$ WHERE word = $q$vaccinated against measles / flu / rabies$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$given a vaccine to protect against a particular disease$q$, translation = $q$được tiêm phòng chống lại bệnh gì
Tất cả học sinh phải được tiêm phòng sởi trước khi đến trường.$q$ WHERE word = $q$vaccinated against something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$gas turns into liquid as it cools$q$, translation = $q$hơi nước / hơi ẩm / hơi nóng ngưng tụ
1) Khi nguội đi, hơi nước ngưng tụ.
2) Hơi ẩm ngưng tụ trên cửa sổ lạnh vào mùa đông.$q$ WHERE word = $q$vapour / moisture / steam condenses$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be different in size, amount or kind to a large degree$q$, translation = $q$thay đổi đáng kể / rất nhiều
1) Giá cả thay đổi đáng kể giữa các cửa hàng.
2) Quan điểm về vấn đề này rất khác nhau.$q$ WHERE word = $q$vary considerably / widely$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to be different in different regions or for different people$q$, translation = $q$khác nhau giữa các vùng / từng người
1) Phong tục khác nhau giữa các vùng.
2) Sở thích khác nhau ở từng người.$q$ WHERE word = $q$vary from region to region / person to person$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$almost or entirely wiped out$q$, translation = $q$gần như / hoàn toàn bị xóa bỏ
1) Căn bệnh gần như đã bị xóa bỏ.
2) Bệnh đậu mùa đã bị xóa bỏ hoàn toàn.$q$ WHERE word = $q$virtually / completely eradicated$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$described or shown in a lively way or in a correct way$q$, translation = $q$được khắc họa sống động / chính xác
1) Khung cảnh được khắc họa sống động trong cuốn tiểu thuyết.
2) Bản đồ thể hiện chính xác đường bờ biển.$q$ WHERE word = $q$vividly / accurately depicted$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$people who are easily harmed, such as children, women or the weak$q$, translation = $q$trẻ em / phụ nữ / những người yếu thế
1) Các tổ chức từ thiện hướng đến bảo vệ trẻ em yếu thế.
2) Mái ấm hỗ trợ những phụ nữ yếu thế.
3) Chính sách được thiết kế để giúp những người yếu thế.$q$ WHERE word = $q$vulnerable children / women / people$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$easily harmed by an attack, damage or fire$q$, translation = $q$dễ bị tấn công / hư hại / cháy
1) Không có tường thành, thành phố dễ bị tấn công.
2) Các tòa nhà cũ dễ bị hư hại khi động đất.
3) Rừng khô dễ bị cháy vào mùa hè.$q$ WHERE word = $q$vulnerable to attack / damage / fire$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$easily harmed or affected by something$q$, translation = $q$dễ bị ảnh hưởng bởi điều gì
Người cao tuổi đặc biệt dễ bị ảnh hưởng bởi cái lạnh.$q$ WHERE word = $q$vulnerable to something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$liquid or blood moves along steadily$q$, translation = $q$nước / máu chảy
1) Nước sông chảy ra biển.
2) Máu chảy qua các động mạch.$q$ WHERE word = $q$water / blood flows$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$arranged or planned in a good or bad way$q$, translation = $q$được tổ chức tốt / kém
1) Sự kiện được tổ chức tốt và diễn ra suôn sẻ.
2) Chuyến đi được tổ chức kém và hỗn loạn.$q$ WHERE word = $q$well / poorly organised$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$recognised as true by many or all people$q$, translation = $q$được công nhận rộng rãi / phổ quát
1) Người ta công nhận rộng rãi rằng tập thể dục cải thiện sức khỏe.
2) Bà được công nhận rộng khắp là một nhà lãnh đạo vĩ đại.$q$ WHERE word = $q$widely / universally acknowledged$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$within a circular area measured from a central point$q$, translation = $q$trong phạm vi bán kính của điều gì
Không có cửa hàng nào trong bán kính năm ki-lô-mét.$q$ WHERE word = $q$within a radius of something$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$to create, write or print poems$q$, translation = $q$viết / sáng tác / xuất bản thơ
1) Cô ấy làm thơ vào thời gian rảnh.
2) Anh ấy sáng tác thơ về biển.
3) Nhà xuất bản của trường đại học xuất bản thơ.$q$ WHERE word = $q$write / compose / publish poetry$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$1. have / lack the energy to do — to have or not have enough strength to do something  
2. put energy into — to devote effort and enthusiasm to something  
3. source of energy — a thing that supplies power  
4. nuclear / alternative / renewable energy — power from atoms, other sources, or sources that do not run out
$q$, translation = $q$1. có năng lượng làm gì / thiếu năng lượng làm gì  
2. dồn năng lượng vào  
3. nguồn năng lượng  
4. năng lượng hạt nhân / năng lượng thay thế / năng lượng tái tạo
$q$ WHERE word = $q$energy /ˈenədʒi/$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$1. take the floor — to stand up and speak in a meeting or discussion  
2. floor show — an entertainment performance, usually in a restaurant or club  
3. ground / first / etc. floor — the ground, first or other levels of a building  
4. floor plan — a diagram showing the layout of a building's rooms
$q$, translation = $q$1. take the floor — đứng lên phát biểu trong cuộc họp hoặc buổi thảo luận  
2. floor show — buổi diễn giải trí (thường trong nhà hàng hoặc câu lạc bộ)  
3. ground / first / etc. floor — tầng trệt, tầng thứ nhất, hoặc các tầng khác trong tòa nhà  
4. floor plan — sơ đồ hoặc bản vẽ bố trí mặt bằng
$q$ WHERE word = $q$floor$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$1. make up your mind — to decide  
2. cross / slip your mind — to occur to you suddenly / to be forgotten  
3. bear in mind / keep in mind — to remember something and consider it  
4. have a one-track mind — to think about only one thing  
5. be in two minds — to be undecided, hesitant  
6. on your mind — being thought about, worrying you  
7. take your mind off — to stop you worrying  
8. bring to mind — to make you remember something  
9. never mind — don't worry / it doesn't matter
$q$, translation = $q$1. quyết định  
2. thoáng qua / chợt nghĩ đến / quên mất  
3. nhớ / ghi nhớ điều gì  
4. tập trung (chỉ nghĩ về một điều duy nhất)  
5. phân vân, do dự  
6. nghĩ về / đang nghĩ về điều gì  
7. quên đi (nỗi lo lắng) / khiến bạn quên đi lo lắng  
8. gợi nhớ / gợi nhớ đến điều gì  
9. đừng bận tâm / không sao
$q$ WHERE word = $q$mind /maɪnd/$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$opinionated /əˈpɪnjəneɪtɪd/ – having strong opinions and refusing to change them;$q$, translation = $q$ý kiến; opinionated /əˈpɪnjəneɪtɪd/ – cứng đầu, ngoan cố;$q$ WHERE word = $q$opinion$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$qualitative(ly) /ˈkwɒlɪtətɪv(li)/ – (in a way) relating to quality, not numbers$q$, translation = $q$chất lượng
qualitative(ly), /ˈkwɒlɪtətɪv(li)/: (một cách) định tính;$q$ WHERE word = $q$quality$q$;
UPDATE public.default_vocabulary_base SET meaning = $q$rapidly, /ˈræpɪdli/: in a quick way;$q$, translation = $q$nhanh chóng; một cách nhanh chóng$q$ WHERE word = $q$rapid$q$;

-- Post-check: expect 0 (rows in the word list whose meaning still contains Vietnamese letters)
SELECT count(*) AS vietnamese_meanings_left FROM public.default_vocabulary_base
WHERE word IN (
  $q$a 50-mile / ten-mile / 1km radius$q$,
  $q$a bar chart compares something$q$,
  $q$a bar chart shows / illustrates something$q$,
  $q$a basic / abstract / key concept$q$,
  $q$a chain reaction of events$q$,
  $q$a chamber / symphony orchestra$q$,
  $q$a chest / ear / lung infection$q$,
  $q$a co-operative approach / effort / relationship$q$,
  $q$a commuter town / belt$q$,
  $q$a commuter train / bus$q$,
  $q$a compelling argument / reason$q$,
  $q$a conceptual / theoretical framework$q$,
  $q$a condition / situation deteriorates$q$,
  $q$a congestion charge$q$,
  $q$a consistent player / performer$q$,
  $q$a contributing factor$q$,
  $q$a corrupt / opposition politician$q$,
  $q$a current affairs programme$q$,
  $q$a current of air / electricity$q$,
  $q$a debate on / over / about something$q$,
  $q$a decade later / ago$q$,
  $q$a definitive answer / conclusion$q$,
  $q$a devastating / flash flood$q$,
  $q$a devastating / powerful hurricane$q$,
  $q$a diagram illustrates / shows something$q$,
  $q$a different / new / fresh perspective$q$,
  $q$a distinct category / type / species$q$,
  $q$a diverse group / population$q$,
  $q$a doctor / specialist examines someone$q$,
  $q$a drama is based on something$q$,
  $q$a drama is set / filmed somewhere$q$,
  $q$a drama unfolds / begins$q$,
  $q$a fast-growing / profitable segment$q$,
  $q$a fatal / deadly / chronic disease$q$,
  $q$a final / ultimate destination$q$,
  $q$a firm's client$q$,
  $q$a first-generation / second-generation immigrant$q$,
  $q$a flawed assumption / premise$q$,
  $q$a flexible approach / system / arrangement$q$,
  $q$a flexible rate / market$q$,
  $q$a flood hits / sweeps somewhere$q$,
  $q$a food / peanut / skin allergy$q$,
  $q$a foster / adoptive / birth parent$q$,
  $q$a glacier melts / retreats$q$,
  $q$a historic agreement / decision / victory$q$,
  $q$a historic event / occasion / moment$q$,
  $q$a hurricane hits / destroys somewhere$q$,
  $q$a leading / senior / prominent politician$q$,
  $q$a legal / regulatory / political framework$q$,
  $q$a likely outcome / candidate$q$,
  $q$a lively / intense / ongoing debate$q$,
  $q$a long-term / chronic / serious addiction$q$,
  $q$a main / direct / scenic route$q$,
  $q$a major / good / bad influence$q$,
  $q$a marked contrast / improvement / increase$q$,
  $q$a minor / severe / fatal stroke$q$,
  $q$a model of efficiency / excellence$q$,
  $q$a modern / cultural equivalent$q$,
  $q$a moral / ethical dilemma$q$,
  $q$a negligible amount / risk / cost$q$,
  $q$a negligible impact / effect / contribution$q$,
  $q$a neutral / tough / moral stance$q$,
  $q$a new / next millennium$q$,
  $q$a null / testable / alternative hypothesis$q$,
  $q$a painting / photograph depicts something$q$,
  $q$a pie chart shows / displays something$q$,
  $q$a pioneering technique / concept$q$,
  $q$a pivotal role / moment / figure$q$,
  $q$a political / religious / economic ideology$q$,
  $q$a powerful / deadly typhoon$q$,
  $q$a problem stems from a fact / misconception$q$,
  $q$a profound change / impact / effect / influence$q$,
  $q$a profound sense of something$q$,
  $q$a prolonged / severe / devastating drought$q$,
  $q$a prospective client$q$,
  $q$a report / rule states something$q$,
  $q$a residential / run-down neighbourhood$q$,
  $q$a rural area / community / population$q$,
  $q$a rural economy / road$q$,
  $q$a safe / good / quiet neighbourhood$q$,
  $q$a scientific / broad / general consensus$q$,
  $q$a scientific / evolutionary theory$q$,
  $q$a segment of something$q$,
  $q$a serious / real / major / great challenge$q$,
  $q$a severe / common / life-threatening allergy$q$,
  $q$a significant / profound / lasting impact$q$,
  $q$a simple / complex / schematic diagram$q$,
  $q$a single / lone parent$q$,
  $q$a skilled / illegal immigrant$q$,
  $q$a sociology professor / lecturer / student$q$,
  $q$a stage of a cycle / process$q$,
  $q$a stage of development / evolution$q$,
  $q$a stroke victim / patient / unit$q$,
  $q$a strong / ocean current$q$,
  $q$a subsequent investigation / enquiry$q$,
  $q$a subsequent year / event / generation$q$,
  $q$a successful / likely outcome$q$,
  $q$a tentative conclusion / theory$q$,
  $q$a tentative step / agreement / deal$q$,
  $q$a theory of something$q$,
  $q$a tolerant society / country / attitude$q$,
  $q$a tourist / holiday / popular / favourite destination$q$,
  $q$a trade / escape / supply route$q$,
  $q$a valid reason / point / argument$q$,
  $q$a valuable asset / lesson / resource / experience$q$,
  $q$a valuable contribution / item$q$,
  $q$a viral / bacterial / respiratory infection$q$,
  $q$a vulnerable position$q$,
  $q$a younger / elder sibling$q$,
  $q$abandon a project / plan / ship$q$,
  $q$abundant wildlife / evidence / resources$q$,
  $q$accompanied by a bodyguard / adult / escort$q$,
  $q$accompanied by someone$q$,
  $q$accurate information / figures$q$,
  $q$acknowledge the existence / importance of something$q$,
  $q$acknowledge the need for something$q$,
  $q$actively / urgently / desperately seek$q$,
  $q$addiction to something$q$,
  $q$address a problem / issue / concern$q$,
  $q$adjust figures / rates$q$,
  $q$adjust to something$q$,
  $q$administer a dose / injection / vaccine / drug$q$,
  $q$administer something to someone$q$,
  $q$adopt / take a stance on something$q$,
  $q$advise / represent a client$q$,
  $q$advocate reform / legislation$q$,
  $q$affect the outcome / quality / performance$q$,
  $q$allergy sufferers / symptoms$q$,
  $q$alter the course / outcome of something$q$,
  $q$ambiguous language / wording$q$,
  $q$an abandoned building / vehicle$q$,
  $q$an abundant supply of something$q$,
  $q$an accurate description / prediction$q$,
  $q$an addiction problem / clinic / counsellor$q$,
  $q$an allergy to something$q$,
  $q$an Antarctic / Alaskan glacier$q$,
  $q$an archaeology student / professor / department$q$,
  $q$an astronomy professor / enthusiast / mission$q$,
  $q$an autonomous individual$q$,
  $q$an autonomous region / republic / province$q$,
  $q$an economic / financial / humanitarian crisis$q$,
  $q$an economics professor / degree / department$q$,
  $q$an efficient manner$q$,
  $q$an efficient use of something$q$,
  $q$an efficient way of doing something$q$,
  $q$an estimated percentage / amount$q$,
  $q$an expanding universe / economy / population$q$,
  $q$an idealistic notion / vision / view$q$,
  $q$an identical copy / twin$q$,
  $q$an immigrant population / community / worker$q$,
  $q$an impact on the environment / economy$q$,
  $q$an initial reaction / response / impression$q$,
  $q$an opera singer / house$q$,
  $q$an overall impression / increase / majority$q$,
  $q$an urban neighbourhood / environment$q$,
  $q$analogous to something$q$,
  $q$analyse data / statistics / results / trends$q$,
  $q$analyse something critically / carefully$q$,
  $q$arrange things in a row$q$,
  $q$attend a meeting / conference / funeral$q$,
  $q$attend regularly / rarely$q$,
  $q$avoid / prevent / cause dehydration$q$,
  $q$badly / adversely / directly affect something$q$,
  $q$badly / severely / permanently damage something$q$,
  $q$be suspended / postponed indefinitely$q$,
  $q$biased against / in favour of someone$q$,
  $q$biased reporting / research$q$,
  $q$broadcast live$q$,
  $q$broadcast on television / radio$q$,
  $q$build / improve / destroy infrastructure$q$,
  $q$carefully evaluate something$q$,
  $q$cause / reduce / ease congestion$q$,
  $q$celebrate / approach / reach the millennium$q$,
  $q$childhood / adult obesity$q$,
  $q$choose / prefer the latter$q$,
  $q$claim falsely / rightly / wrongly$q$,
  $q$claim repeatedly$q$,
  $q$classical architecture / mythology$q$,
  $q$classical music / ballet$q$,
  $q$clear / strong / conclusive evidence$q$,
  $q$clearly / easily distinguish$q$,
  $q$clearly / most marked$q$,
  $q$clearly / narrowly / broadly defined$q$,
  $q$clinical / cognitive psychology$q$,
  $q$closely / strongly resemble something$q$,
  $q$closely observe$q$,
  $q$comparatively little / small$q$,
  $q$comparatively rare / inexpensive$q$,
  $q$compare something with / to something$q$,
  $q$compelling evidence / data$q$,
  $q$completely / dramatically transform something$q$,
  $q$conclusive / irrefutable / concrete proof$q$,
  $q$condense into rain / droplets$q$,
  $q$conduct an orchestra$q$,
  $q$consistent with a finding / hypothesis$q$,
  $q$consistent with something$q$,
  $q$continue indefinitely$q$,
  $q$contract / transmit / spread an infection$q$,
  $q$contract rhythmically / rapidly$q$,
  $q$contrast sharply / starkly$q$,
  $q$contrast with something$q$,
  $q$contribute greatly / significantly$q$,
  $q$contribute to something$q$,
  $q$conventional forces / weapons$q$,
  $q$conventional treatment / methods$q$,
  $q$conventional wisdom / thinking$q$,
  $q$convey a message$q$,
  $q$convey a sense / impression of something$q$,
  $q$convey something vividly / powerfully / accurately$q$,
  $q$cure / treat / overcome / fight an addiction$q$,
  $q$damage someone's reputation / credibility$q$,
  $q$damage the environment$q$,
  $q$data / findings suggest something$q$,
  $q$decades of war / conflict / neglect$q$,
  $q$decline from x to y / by x$q$,
  $q$define a term / concept$q$,
  $q$define something as / in terms of something$q$,
  $q$definitive proof$q$,
  $q$delay the onset / start of something$q$,
  $q$deliberately / highly ambiguous$q$,
  $q$determine the cause / extent of something$q$,
  $q$determine the outcome / future$q$,
  $q$develop / diagnose / trigger an allergy$q$,
  $q$develop / propose / formulate a theory$q$,
  $q$develop a technique / strategy / idea$q$,
  $q$develop into something$q$,
  $q$diagnosed with a disorder / disease / tumour$q$,
  $q$diagnosed with cancer / diabetes / leukaemia$q$,
  $q$differ from something$q$,
  $q$differ significantly / markedly$q$,
  $q$differentiate between things$q$,
  $q$differentiate something from something$q$,
  $q$difficult / impossible to predict$q$,
  $q$diminish in importance / size / number$q$,
  $q$dispute a claim / assertion / allegation$q$,
  $q$distinct from something$q$,
  $q$distinguish between things$q$,
  $q$drought affects / hits somewhere$q$,
  $q$drug / nicotine / alcohol addiction$q$,
  $q$educational / evolutionary psychology$q$,
  $q$embrace / reject an ideology$q$,
  $q$encounter a difficulty / problem$q$,
  $q$encounter resistance / opposition$q$,
  $q$entirely / amply justified$q$,
  $q$entirely / fairly / broadly consistent$q$,
  $q$eradicate disease / poverty / illiteracy$q$,
  $q$especially / highly / increasingly vulnerable$q$,
  $q$establish a link / relationship$q$,
  $q$estimate cost / value / revenue$q$,
  $q$estimate something at x$q$,
  $q$ethnically / culturally diverse$q$,
  $q$evacuate / warn / advise residents$q$,
  $q$evaluate a situation / impact / risk$q$,
  $q$evaluate the effectiveness of something$q$,
  $q$evidence / research suggests$q$,
  $q$evidence of / for something$q$,
  $q$evolve from / into something$q$,
  $q$exacerbate a problem / situation / conflict$q$,
  $q$exacerbate tensions / symptoms$q$,
  $q$examine a patient$q$,
  $q$examine someone carefully$q$,
  $q$expand capacity / production$q$,
  $q$expand rapidly / dramatically$q$,
  $q$fiercely / relatively / largely autonomous$q$,
  $q$find / gather / collect evidence$q$,
  $q$firmly / quickly establish something$q$,
  $q$flawed logic / reasoning$q$,
  $q$flexible working / working hours$q$,
  $q$flow freely / steadily / constantly$q$,
  $q$free-market / development economics$q$,
  $q$from the perspective of someone$q$,
  $q$fuel / energy efficient$q$,
  $q$fully vaccinated$q$,
  $q$generate excitement / publicity / controversy$q$,
  $q$generate income / electricity / power$q$,
  $q$genetically / chemically modified$q$,
  $q$gradually / considerably diminished$q$,
  $q$have / exert influence on someone$q$,
  $q$have / fear repercussions$q$,
  $q$have drawbacks$q$,
  $q$health / economic / social benefit$q$,
  $q$heart / lung / kidney disease$q$,
  $q$highly / extremely efficient$q$,
  $q$highly / increasingly likely$q$,
  $q$hotly / bitterly disputed$q$,
  $q$identical to / with something$q$,
  $q$increase / extend the width$q$,
  $q$increase / reduce volume$q$,
  $q$increase / rise / improve marginally$q$,
  $q$indigenous / native / local inhabitants$q$,
  $q$inevitably lead to / result in something$q$,
  $q$infection control / prevention$q$,
  $q$intense competition / rivalry$q$,
  $q$intense heat / pain / pressure / scrutiny$q$,
  $q$intervene in a dispute / conflict / crisis$q$,
  $q$intervene personally / directly$q$,
  $q$introduce / adopt / follow a model$q$,
  $q$investigate a link / case / complaint$q$,
  $q$justify a war / action / expense$q$,
  $q$Keynesian / classical / experimental economics$q$,
  $q$language / technology evolves$q$,
  $q$launch a campaign / an attack$q$,
  $q$launch a product / brand / book$q$,
  $q$likely to happen / cause / continue$q$,
  $q$local / permanent / elderly residents$q$,
  $q$look / sound / think alike$q$,
  $q$marginally higher / lower$q$,
  $q$maritime / industrial / classical archaeology$q$,
  $q$modern / historical / applied linguistics$q$,
  $q$morally / economically justified$q$,
  $q$object strongly$q$,
  $q$object to something$q$,
  $q$object to the idea / use of something$q$,
  $q$observe behaviour$q$,
  $q$of medium / normal / average height$q$,
  $q$openly / strongly / publicly advocate$q$,
  $q$orally / intravenously administered$q$,
  $q$organise a meeting / event / demonstration$q$,
  $q$organise things by group / topic$q$,
  $q$outweigh / overcome drawbacks$q$,
  $q$overall spending / revenue$q$,
  $q$overcome a problem / difficulty / obstacle$q$,
  $q$overcome an injury / deficit$q$,
  $q$participate equally / willingly / effectively$q$,
  $q$participate in a discussion / activity / debate$q$,
  $q$particularly useful / important / relevant$q$,
  $q$particularly vulnerable / concerned$q$,
  $q$peacefully / amicably resolve something$q$,
  $q$perfectly / equally valid$q$,
  $q$pioneering work / surgery / research$q$,
  $q$planetary / theoretical / modern astronomy$q$,
  $q$pose / face / solve a dilemma$q$,
  $q$predict a rise / decline / recovery$q$,
  $q$predict an event / outcome$q$,
  $q$present / pose / accept / face / meet a challenge$q$,
  $q$prevent / combat / treat an infection$q$,
  $q$prevent / treat / cure a disease$q$,
  $q$prior approval / permission / consent$q$,
  $q$prior knowledge / experience$q$,
  $q$proof of identity / residency$q$,
  $q$prove / become pivotal$q$,
  $q$prove / become valuable$q$,
  $q$provisionally agreed / accepted / scheduled$q$,
  $q$provoke a reaction / response / debate$q$,
  $q$provoke outrage / anger / controversy$q$,
  $q$question the validity / legality of something$q$,
  $q$question the wisdom / motives of someone$q$,
  $q$racially tolerant$q$,
  $q$radically / fundamentally alter something$q$,
  $q$rapidly / steadily deteriorate$q$,
  $q$reach / build / achieve a consensus$q$,
  $q$reach a height of x$q$,
  $q$reap the benefit of something$q$,
  $q$reasonably / factually accurate$q$,
  $q$recite / read / quote poetry$q$,
  $q$reinforce a perception / view / belief$q$,
  $q$reinforce a stereotype / message$q$,
  $q$relatively easy / cheap / recently$q$,
  $q$relatively small / low / short$q$,
  $q$represent a difference / increase / shift$q$,
  $q$resolve / face a crisis$q$,
  $q$resolve a dispute / conflict / issue$q$,
  $q$result from use / a failure / lack$q$,
  $q$result in a loss / increase / reduction$q$,
  $q$routinely / properly screen$q$,
  $q$screen for a disease / condition$q$,
  $q$screen someone for something$q$,
  $q$seasonally / automatically / manually adjusted$q$,
  $q$secure a victory / place / deal$q$,
  $q$secure funding / peace$q$,
  $q$secure the approval / support of someone$q$,
  $q$seek approval / permission / compensation$q$,
  $q$seek help / advice / refuge / treatment$q$,
  $q$serious / potential / negative repercussions$q$,
  $q$serious / severe / unintended consequences$q$,
  $q$severe / mild / extreme dehydration$q$,
  $q$shift one's weight / position$q$,
  $q$shift the focus / emphasis / balance$q$,
  $q$sibling rivalry 2$q$,
  $q$significantly / extensively modified$q$,
  $q$someone is diagnosed with something$q$,
  $q$something stretches / extends the length of something$q$,
  $q$spark / provoke / trigger a debate$q$,
  $q$state a fact / reason / preference$q$,
  $q$state clearly / explicitly$q$,
  $q$steadily / rapidly / sharply decline$q$,
  $q$stem from something$q$,
  $q$strongly / tentatively suggest$q$,
  $q$suffer / face / accept the consequences$q$,
  $q$suffer / have / prevent a stroke$q$,
  $q$suspended from a ceiling / hook$q$,
  $q$tackle / prevent / reduce obesity$q$,
  $q$tackle a problem / issue / task$q$,
  $q$tackle crime / corruption$q$,
  $q$take / follow / choose a route$q$,
  $q$temporarily / indefinitely suspend something$q$,
  $q$test / support / confirm a hypothesis$q$,
  $q$the benefit of something$q$,
  $q$the circumference of something$q$,
  $q$the concept of freedom / democracy / justice$q$,
  $q$the consequences of war / action / failure$q$,
  $q$the entire / full / overall length of something$q$,
  $q$the equivalent of something$q$,
  $q$the front / back row$q$,
  $q$the geology of somewhere$q$,
  $q$the geology of the area / region / island$q$,
  $q$the inhabitants of somewhere$q$,
  $q$the initial stages / results$q$,
  $q$the last / next decade$q$,
  $q$the latter stage / part / category$q$,
  $q$the length of something$q$,
  $q$the main / major drawback$q$,
  $q$the maximum / minimum height$q$,
  $q$the muscles / ventricles contract$q$,
  $q$the obesity epidemic / rate / problem$q$,
  $q$the outcome of something$q$,
  $q$the parents of someone$q$,
  $q$the sheer / huge / high volume$q$,
  $q$the sociology of religion / science$q$,
  $q$the volume of traffic / data$q$,
  $q$the width of something$q$,
  $q$thoroughly / properly investigate$q$,
  $q$tolerant of something$q$,
  $q$traffic / road congestion$q$,
  $q$transform a country / business / area$q$,
  $q$transmit / contract / develop a disease$q$,
  $q$transport / rail / security infrastructure$q$,
  $q$trigger / set off a chain reaction$q$,
  $q$trigger a crisis / war / debate$q$,
  $q$trigger a tsunami / landslide / avalanche$q$,
  $q$urban sprawl / renewal / planning$q$,
  $q$urgently / directly address something$q$,
  $q$vaccinated against measles / flu / rabies$q$,
  $q$vaccinated against something$q$,
  $q$vapour / moisture / steam condenses$q$,
  $q$vary considerably / widely$q$,
  $q$vary from region to region / person to person$q$,
  $q$virtually / completely eradicated$q$,
  $q$vividly / accurately depicted$q$,
  $q$vulnerable children / women / people$q$,
  $q$vulnerable to attack / damage / fire$q$,
  $q$vulnerable to something$q$,
  $q$water / blood flows$q$,
  $q$well / poorly organised$q$,
  $q$widely / universally acknowledged$q$,
  $q$within a radius of something$q$,
  $q$write / compose / publish poetry$q$,
  $q$energy /ˈenədʒi/$q$,
  $q$floor$q$,
  $q$mind /maɪnd/$q$,
  $q$opinion$q$,
  $q$quality$q$,
  $q$rapid$q$
) AND meaning ~ $q$[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]$q$;

COMMIT;

-- ROLLBACK (manual; run only if needed)
-- BEGIN;
-- UPDATE public.default_vocabulary_base d
--    SET meaning = b.meaning, translation = b.translation
--   FROM public.default_vocabulary_base_bak_20261116_vimeaning b
--  WHERE d.word = b.word;
-- COMMIT;
-- DROP TABLE public.default_vocabulary_base_bak_20261116_vimeaning;  -- after confirming

-- =====================================================================================
-- ADDENDUM (applied 2026-11-16)
-- One more server row had a Vietnamese meaning that the >=2-letter detector missed
-- (454 server rows in total). Fixed live with the statements below.
-- =====================================================================================
BEGIN;

INSERT INTO public.default_vocabulary_base_bak_20261116_vimeaning
SELECT d.* FROM public.default_vocabulary_base d
WHERE d.word = $q$measure the circumference$q$
  AND NOT EXISTS (SELECT 1 FROM public.default_vocabulary_base_bak_20261116_vimeaning b WHERE b.word = d.word);

UPDATE public.default_vocabulary_base
   SET meaning = $q$to find the distance around the outside of a circle or a round object$q$,
       translation = $q$đo chu vi$q$ || E'\n' || translation
 WHERE word = $q$measure the circumference$q$
   AND meaning = $q$đo chu vi$q$;

COMMIT;
