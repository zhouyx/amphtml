/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CSS} from '../../../build/amp-sticky-ad-0.1.css';
import {Layout} from '../../../src/layout';
import {dev} from '../../../src/log';
import {isExperimentOn} from '../../../src/experiments';
import {isLayoutSizeDefined} from '../../../src/layout';

/** @const */
const TAG = 'amp-sticky-ad';

class AmpStickyAd extends AMP.BaseElement {
  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.NODISPLAY;
  }

  /** @override */
  buildCallback() {
    /** @const @private {boolean} */
    this.isExperimentOn_ = isExperimentOn(this.getWin(), TAG);
    if (!this.isExperimentOn_) {
      dev.warn(TAG, `TAG ${TAG} disabled`);
      return;
    }
    this.viewport_ = this.getViewport();
    this.unlistenScroll = null;
  }


  layoutCallback() {
    this.isExperimentOn_ = isExperimentOn(this.getWin(), EXPERIMENT);
    if (!this.isExperimentOn_) {
      dev.warn(TAG, `Experiment ${EXPERIMENT} disabled`);
      return Promise.resolve();
    }
    this.scheduleLayout(this.element.firstElementChild);
    this.updateInViewport(this.element.firstElementChild, true);
    this.viewport_.addToFixedLayer(this.element);
    var maxHeight = Math.min(window.innerHeight/6, 100);
    this.element.style.maxHeight = maxHeight.toString() + 'px';
    /*this.element.style.visibility = 'hidden';
    this.viewport_.onScroll = (scroll => {
      this.element.style.visibility = 'visible';
      var top  = window.pageYOffset || document.documentElement.scrollTop;
      console.log(top);
      console.log('scroll')
    });*/
    return Promise.resolve();
  }
  scrollCallback() {
    this.element.style.display = 'block';
    console.log("scroll");
  }

}

AMP.registerElement('amp-sticky-ad', AmpStickyAd, CSS);
