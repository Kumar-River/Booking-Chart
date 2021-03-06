(function() {
  'use strict';

  // Halls controller
  angular
    .module('core')
    .controller('RateSummariesController', RateSummariesController);

  RateSummariesController.$inject = ['DATA_BACKGROUND_COLOR', 'CommonService', '$scope', '$state', '$rootScope', '$mdDialog', 'Notification', 'summariesResolve', 'isHallRate', 'HallsService', '$mdpDatePicker', 'TaxesService', 'MESSAGES'];

  function RateSummariesController(DATA_BACKGROUND_COLOR, CommonService, $scope, $state, $rootScope, $mdDialog, Notification, summariesResolve, isHallRate, HallsService, $mdpDatePicker, TaxesService, MESSAGES) {
    $scope.model = {
      rate: summariesResolve
    };

    $scope.ui = {
      mNumberPattern: /^[0-9]+(\.[0-9]{1,2})?$/,
      isHallRate: isHallRate,
      isDataChanged: false
    };

    $scope.unconfirmed = {};

    $scope.DATA_BACKGROUND_COLOR = DATA_BACKGROUND_COLOR;

    $scope.loadInitial = function() {
      if (isHallRate) {
        $scope.unconfirmed = {
          effectiveDate: dateConvertion(new Date()),
          rate: null,
          powerConsumpationCharges: null,
          cleaningCharges: null
        };
      } else {
        $scope.unconfirmed = {
          effectiveDate: dateConvertion(new Date()),
          percentage: null
        }
      }
    };

    $scope.cancel = function() {
      if ($scope.ui.isDataChanged || $scope.unconfirmed.rate != null || $scope.unconfirmed.powerConsumpationCharges != null || $scope.unconfirmed.cleaningCharges != null || $scope.unconfirmed.percentage != null) {
        var confirm = $mdDialog.confirm().title('Do you want to close?').textContent('If you close, new data will not be saved.').ok('Yes').cancel('No').multiple(true);
        $mdDialog.show(confirm).then(function() {
            $mdDialog.cancel();
          },
          function() {
            console.log("no");
          });
      } else
        $mdDialog.cancel();
    }

    $scope.isEdit = function(rate) {
      rate.isEdit = true;
    }

    $scope.addIsEdit = function(rate) {
      rate.isEdit = false;
    };

    function dateConvertion(date) {
      return moment(date).format('YYYY-MM-DD');
    }

    $scope.showEffectiveDatePicker = function(ev, rate) {
      var today = new Date();
      $mdpDatePicker(new Date(rate.effectiveDate), {
          targetEvent: ev,
          minDate: (moment(new Date(rate.effectiveDate).setHours(0, 0, 0, 0)) < moment(today.setHours(0, 0, 0, 0))) ? new Date(rate.effectiveDate) : today
        })
        .then(function(dateTime) {
          var summaryRate = CommonService.findRateSummariesByDateBeforeSave($scope.model.rate.rateSummaries, new Date(dateTime));
          console.log(summaryRate.length);
          if (summaryRate.length > 0) {
            if (rate !== summaryRate[0]) {
              var index = _.indexOf($scope.model.rate.rateSummaries, summaryRate[0]);
              rate.effectiveDate = dateConvertion(dateTime);

              $scope.model.rate.rateSummaries.splice(index, 1);
              $scope.ui.isDataChanged = true;
            }
            else
            {
              console.log('same item');
            }
          } else {
            rate.effectiveDate = dateConvertion(dateTime);
            $scope.ui.isDataChanged = true;
          }
        });
    };

    $scope.showUnconfirmedEffectiveDatePicker = function(ev) {
      var today = new Date();
      $mdpDatePicker($scope.unconfirmed.effectiveDate, {
          targetEvent: ev,
          minDate: today
        })
        .then(function(dateTime) {
          $scope.unconfirmed.effectiveDate = dateConvertion(dateTime);
        });
    };

    $scope.addRateSummary = function() {
      checkEffectiveDate();
      $scope.loadInitial();

      $scope.ui.isDataChanged = true;
    };

    $scope.removeRateSummary = function(rate) {
      var index = _.findIndex($scope.model.rate.rateSummaries, function(o) {
        return o._id == rate._id;
      });
      $scope.model.rate.rateSummaries.splice(index, 1);
    };

    $scope.save = function() {
      if (isHallRate) {
        if ($scope.unconfirmed.rate && $scope.unconfirmed.powerConsumpationCharges && $scope.unconfirmed.cleaningCharges && $scope.unconfirmed.effectiveDate) {
          $scope.addRateSummary();
        }
        HallsService.update($scope.model.rate, successCallback, errorCallback);
      } else {
        if ($scope.unconfirmed.percentage && $scope.unconfirmed.effectiveDate) {
          $scope.addRateSummary();
        }
        TaxesService.update($scope.model.rate, successCallback, errorCallback);
      }

      function successCallback(res) {
        $mdDialog.hide(res);
      }

      function errorCallback(res) {
        Notification.error({
          message: res.data.message,
          title: '<i class="glyphicon glyphicon-remove"></i> '+MESSAGES.ERR_TITLE_UPDATE_RATE_SUMMARY
        });
      }
    };

    function checkEffectiveDate() {
      var unconfirmedEffectiveDate = new Date($scope.unconfirmed.effectiveDate);
      var summaryRate = CommonService.findRateSummariesByDateBeforeSave($scope.model.rate.rateSummaries, unconfirmedEffectiveDate);
      if (summaryRate.length > 0) {
        var index = _.indexOf($scope.model.rate.rateSummaries, summaryRate[0]);
        if (isHallRate) {
          $scope.model.rate.rateSummaries[index] = {
            rate: $scope.unconfirmed.rate,
            powerConsumpationCharges: $scope.unconfirmed.powerConsumpationCharges,
            cleaningCharges: $scope.unconfirmed.cleaningCharges,
            effectiveDate: $scope.unconfirmed.effectiveDate
          };
        } else {
          $scope.model.rate.rateSummaries[index] = {
            percentage: $scope.unconfirmed.percentage,
            effectiveDate: $scope.unconfirmed.effectiveDate
          };
        }
      } else {
        $scope.model.rate.rateSummaries.push($scope.unconfirmed);
      }
    }

    $scope.onConfirmedDataChanged = function() {
      $scope.ui.isDataChanged = true;
    }
  }
}());
