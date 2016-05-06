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
import {setStyles} from '../../../src/style';
import {vsyncFor} from '../../../src/vsync';

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
    this.viewport_ = this.getViewport();
    if (!this.isExperimentOn_) {
      dev.warn(TAG, `TAG ${TAG} disabled`);
      return;
    }
    this.viewport_ = this.getViewport();
    this.isDisplayed_ = false;
    this.initialScrollTop = this.viewport_.getScrollTop();
    /** @const @private {!Vsync} */
    this.vsync_ = vsyncFor(this.getWin());
    this.viewport_.onScroll(() => {
      console.log("onscroll");
      if(!this.isDisplayed_) {
        console.log("not displayed yet");
        if(this.viewport_.getSize().height < Math.abs(this.viewport_.getScrollTop()
            -this.initialScrollTop)) {
          console.log("should display!");
          this.isDisplayed_ = true;
          this.element.style.display = 'block';

          //this.viewport_.addToFixedLayer(this.element);
          //this.scheduleLayout(this.element.firstElementChild);
          //this.updateInViewport(this.element.firstElementChild, true);
          this.vsync_.mutate(() => {
            setStyles(this.element, {
              'display': 'block',
            });
            this.viewport_.addToFixedLayer(this.element);
            this.scheduleLayout(this.getRealChildren());
          });
        }
      }
    });
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

    /*this.element.style.visibility = 'hidden';
    this.viewport_.onScroll = (scroll => {
      this.element.style.visibility = 'visible';
      var top  = window.pageYOffset || document.documentElement.scrollTop;
      console.log(top);
      console.log('scroll')
    });*/
    return Promise.resolve();
  }



}

AMP.registerElement('amp-sticky-ad', AmpStickyAd, CSS);
