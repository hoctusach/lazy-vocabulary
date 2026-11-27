# Third-party notices

## Kokoro on-device voices (Android app)

| Component | License | URL |
| --- | --- | --- |
| Kokoro-82M by hexgrad | Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M |
| sherpa-onnx by k2-fsa (Next-gen Kaldi) | Apache-2.0 | https://github.com/k2-fsa/sherpa-onnx |
| ONNX Runtime by Microsoft (statically linked in sherpa-onnx) | MIT | https://github.com/microsoft/onnxruntime |
| Kokoro English lexicon (misaki-style, from the k2-fsa model package) | Apache-2.0 | https://huggingface.co/csukuangfj/kokoro-int8-multi-lang-v1_0 |
| CMU Pronouncing Dictionary | BSD-2-Clause | https://github.com/cmusphinx/cmudict |
| Kotlin standard library | Apache-2.0 | https://github.com/JetBrains/kotlin |

The model files (int8 Kokoro-82M v1.0 as packaged by k2-fsa) are downloaded on demand from Hugging Face, pinned to revision
`57adb37fc0e8d4bd430cfc1b8f8c2294945b9af2` of `csukuangfj/kokoro-int8-multi-lang-v1_0`. espeak-ng (GPL) is not used or included.

The sherpa-onnx native library (`libsherpa-onnx-jni.so`, from the v2.0.2 release AAR) also statically includes
ONNX Runtime (MIT), OpenFst and kaldifst (Apache-2.0), kaldi-native-fbank (Apache-2.0), nlohmann/json (MIT) and
SentencePiece-derived code (Apache-2.0); see https://github.com/k2-fsa/sherpa-onnx for their notices. Since v2.0.0
sherpa-onnx no longer links espeak-ng; the binary contains no espeak symbols (checked with `strings`).

The bundled `android/app/src/main/assets/kokoro/cmudict-extra-us.txt` is derived from the CMU Pronouncing Dictionary
(cmusphinx/cmudict@74790861f652b15e4ac49015a90074ad62a27690).

## CMU Pronouncing Dictionary license

Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
   The contents of this file are deemed to be source code.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in
   the documentation and/or other materials provided with the
   distribution.

This work was supported in part by funding from the Defense Advanced
Research Projects Agency, the Office of Naval Research and the National
Science Foundation of the United States of America, and by member
companies of the Carnegie Mellon Sphinx Speech Consortium. We acknowledge
the contributions of many volunteers to the expansion and improvement of
this dictionary.

THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ``AS IS'' AND
ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY
NOR ITS EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Scan text (FB-66)

| Component | License | URL |
| --- | --- | --- |
| Google ML Kit Text Recognition and Translation (on device) | ML Kit terms of service | https://developers.google.com/ml-kit |
| @capacitor-mlkit/text-recognition, @capacitor-mlkit/translation (Capawesome) | Apache-2.0 | https://github.com/capawesome-team/capacitor-mlkit |
| @capacitor/camera | MIT | https://github.com/ionic-team/capacitor-plugins |
| Free Dictionary API (English meaning provider, no key) | see https://dictionaryapi.dev | https://dictionaryapi.dev |
