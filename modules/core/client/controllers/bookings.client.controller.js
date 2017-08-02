(function() {
  'use strict';

  angular
    .module('core')
    .controller('BookingsController', BookingsController);

  BookingsController.$inject = ['bookedHallsResolve', 'CommonService', 'CALENDAR_CHANGE_VIEW', 'eventTypesResolve', 'paymentStatusesResolve', 'taxesResolve', '$scope', '$state', '$rootScope', '$mdDialog', '$mdToast', '$timeout', 'hallsResolve', 'MESSAGES', 'Notification', 'NewbookingsService', 'SearchBookingServices', 'HARDCODE_VALUES'];

  function BookingsController(bookedHallsResolve, CommonService, CALENDAR_CHANGE_VIEW, eventTypesResolve, paymentStatusesResolve, taxesResolve, $scope, $state, $rootScope, $mdDialog, $mdToast, $timeout, hallsResolve, MESSAGES, Notification, NewbookingsService, SearchBookingServices, HARDCODE_VALUES) {
    $rootScope.isUserLoggedIn = true;

    $scope.model = {
      events: [],
      newBookings: bookedHallsResolve,
      mColorFilter: 1,  
      eventTypes: eventTypesResolve,
      paymentStatuses: paymentStatusesResolve,
      taxes: taxesResolve, 
    };

    $scope.ui = {
      mCalendarTitle: '',
      mColorFilter: 'payment',
      validateSettings: false,
      renderView: undefined,
    };

    $scope.searchParams = {
      selectedHalls: hallsResolve
    };


    $scope.halls = {
      mAllHalls: hallsResolve
    };

    $scope.chart = {
      labels: [],
      data: [],
      colors: [],
      options: {
        title: {
          display: true,
          fontSize: 15,
          text: 'Payment summary ' + $scope.ui.mCalendarTitle
        },
        legend: {
          display: true,
          position: "bottom"
        }
      }
    };

    $scope.CALENDAR_CHANGE_VIEW = CALENDAR_CHANGE_VIEW;

    $scope.loadinitial = function() {
      angular.forEach($scope.model.newBookings, function(newbooking) {
        eventsPush(newbooking);
      });
      var date = new Date();
      chartViewByAgenda(CALENDAR_CHANGE_VIEW[2], date);
    };

    $scope.model.paymentStatuses.$promise.then(function(result) {
      $scope.loadinitial();
    });

    $scope.selectedHallsChanged = function() {
      $scope.model.events.length = 0;
      $scope.model.newBookings.length = 0;
      SearchBookingServices.requestsearch($scope.searchParams).then(function(searchResults) {
        $scope.model.newBookings = searchResults;
        angular.forEach(searchResults, function(searchResult) {
          eventsPush(searchResult);
        });
        chartSummary(searchResults);
      });
    };

    $scope.colorFilter = function() {
      $scope.model.events.length = 0;
      $scope.loadinitial();
      angular.element('#calendar').fullCalendar('removeEvents');
      angular.element('#calendar').fullCalendar('addEventSource', $scope.model.events);
    };

    var currentView = CALENDAR_CHANGE_VIEW[2];


    //with this you can handle the events that generated by clicking the day(empty spot) in the calendar
    $scope.dayClick = function(date, allDay, jsEvent, view) {
      validateSettings();
      if (!$scope.ui.validateSettings) {
         console.log("day click date " + date);
        if (moment(date) < moment(new Date().setHours(0, 0, 0, 0))) {
          Notification.error({
            message: MESSAGES.PAST_DATE,
            title: '<i class="glyphicon glyphicon-remove"></i> Past Date Error !!!'
          });
        } else {
          var confirm = $mdDialog.confirm().title('Do you want to create new booking?').ok('Yes').cancel('No');

          var oldShow = $mdDialog.show;
          $mdDialog.show = function(options) {
            if (options.hasOwnProperty("skipHide")) {
              options.multiple = options.skipHide;
            }
            return oldShow(options);
          };

          $mdDialog.show(confirm).then(function() {
              $mdDialog.show({
                  controller: 'NewbookingsController',
                  templateUrl: 'modules/newbookings/client/views/form-newbooking.client.view.html',
                  parent: angular.element(document.body),
                  clickOutsideToClose: false,
                  fullscreen: true,
                  resolve: {
                    selectedDate: function() {
                      return date;
                    },
                    selectedEvent: function() {
                      return null;
                    },
                    viewMode: function() {
                      return false;
                    }
                  },
                })
                .then(function(updatedItem) {
                  $scope.model.newBookings.push(updatedItem);
                  eventsPush(updatedItem);
                  var moment = $scope.ui.renderView.calendar.getDate();
                  var date = new Date(moment.format());
                  chartViewByAgenda($scope.ui.renderView.name, date);
                }, function() {
                  console.log('You cancelled the dialog.');
                });
            },
            function() {
              console.log("no");
            });
        }
      }

    };


    //with this you can handle the events that generated by droping any event to different position in the calendar
    $scope.alertOnDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
      $scope.$apply();
    };


    //with this you can handle the events that generated by resizing any event to different position in the calendar
    $scope.alertOnResize = function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {
      $scope.$apply();
    };


    //with this you can handle the click on the events
    $scope.eventClick = function(event) {
      var oldShow = $mdDialog.show;
        $mdDialog.show = function(options) {
          if (options.hasOwnProperty("skipHide")) {
            options.multiple = options.skipHide;
          }
          return oldShow(options);
        };
      NewbookingsService.get({
        newbookingId: event._id
      }, function(data) {
        $mdDialog.show({
            controller: 'NewbookingsController',
            templateUrl: 'modules/newbookings/client/views/form-newbooking.client.view.html',
            parent: angular.element(document.body),
            clickOutsideToClose: false,
            fullscreen: true,
            resolve: {
              selectedDate: function() {
                return event.start;
              },
              selectedEvent: function() {
                return data;
              },
              viewMode: function() {
                return true;
              }
            },
          })
          .then(function(updatedItem) {
            var index = findIndexByID($scope.model.events, event._id);
            if(updatedItem.isDelete) {
              var bookingIndex = findIndexByID($scope.model.newBookings, data._id);
              $scope.model.events.splice(index, 1);
              $scope.model.newBookings.splice(bookingIndex, 1);
              var view = $scope.ui.renderView;
              var moment = view.calendar.getDate();
              var date = new Date(moment.format());
              chartViewByAgenda(view.name, date);
            } else {
              $scope.model.events[index] = updatedItem;
             }
          }, function() {
            console.log('You cancelled the dialog.');
          });
      });
    };


    //with this you can handle the events that generated by each page render process
    $scope.renderView = function(view) {
      $scope.ui.renderView = view;
      var moment = view.calendar.getDate();
      var date = new Date(moment.format());
      chartViewByAgenda(view.name, date);

      $timeout(function() {
        $scope.$apply();
      });

      $scope.ui.mCalendarTitle = view.title;
    };

    //with this you can handle the events that generated when we change the view i.e. Month, Week and Day
    $scope.changeView = function(view, calendar) {
      currentView = view;
      var moment = angular.element('#calendar').fullCalendar('getDate');
      var date = new Date(moment.format());
      chartViewByAgenda(view, date);

      $timeout(function() { //calendar is coming undefined, so i am using 'angular.element('#calendar')' with timeout
        angular.element('#calendar').fullCalendar('changeView', view);

        $scope.$apply();
      });
    };

    function eventsPush(booking) {
      var colorCode;
      if($scope.model.mColorFilter === 1 || $scope.model.mColorFilter === '1') {
        colorCode = booking.mSelectedPaymentStatus.colour.code;
      } else {
        colorCode = booking.mSelectedEventType.colour.code;
      }
      var bookingTitle = booking.mSelectedEventType.name;
      if(booking.mSelectedEventType.name === HARDCODE_VALUES[0]) {
        bookingTitle = booking.mOtherEvent;
      }
      $scope.model.events.push({
        _id: booking._id,
        title: bookingTitle.charAt(0).toUpperCase() + bookingTitle.slice(1),
        start: new Date(booking.mStartDateTime),
        end: new Date(booking.mEndDateTime),
        color: colorCode,
        stick: true
      });
    };

    function validateSettings() {
      if ($scope.halls.mAllHalls.length == 0) {
        Notification.error({
          message: "Please add halls in settings.",
          title: '<i class="glyphicon glyphicon-remove"></i> Halls Error !!!'
        });
        $scope.ui.validateSettings = true;
      }

      if ($scope.model.eventTypes.length == 0) {
        Notification.error({
          message: "Please add event types in settings.",
          title: '<i class="glyphicon glyphicon-remove"></i> Event Error !!!'
        });
        $scope.ui.validateSettings = true;
      }

      if ($scope.model.paymentStatuses.length == 0) {
        Notification.error({
          message: "Please add payment statuses in settings.",
          title: '<i class="glyphicon glyphicon-remove"></i> Payment status Error !!!'
        });
        $scope.ui.validateSettings = true;
      }
    };

    function chartSummary(bookedHalls) {
      $scope.chart.data.length = 0;
      $scope.chart.labels.length = 0;
      $scope.chart.colors.length = 0;
      if ($scope.model.mColorFilter === 1 || $scope.model.mColorFilter === '1') {
        paymentChart(bookedHalls);
      } else {
        eventTypeChart(bookedHalls);
      }
    };

    function paymentChart(bookedHalls) {
      $scope.chart.options.title.text = "Payment Summary";
      angular.forEach($scope.model.paymentStatuses, function(payment) {
        var length = CommonService.getPaymentCountFromBookedHall(bookedHalls, payment.name);
        $scope.chart.data.push(length);
        var name = payment.name;
        $scope.chart.labels.push(name.charAt(0).toUpperCase() + name.slice(1));
        $scope.chart.colors.push(payment.colour.code);
      });
    };

    function eventTypeChart(bookedHalls) {
      $scope.chart.options.title.text = "EventType Summary";
      angular.forEach($scope.model.eventTypes, function(eventType) {
        var length = CommonService.getEventTypeCountFromBookedHall(bookedHalls, eventType.name);
        $scope.chart.data.push(length);
        var name = eventType.name;
        $scope.chart.labels.push(name.charAt(0).toUpperCase() + name.slice(1));
        $scope.chart.colors.push(eventType.colour.code);
      });
    };

    function chartViewByAgenda(view, date) {
      if(view === CALENDAR_CHANGE_VIEW[0]) {
        var bookedHalls = CommonService.findBookedHallsByDay($scope.model.newBookings, date);
        chartSummary(bookedHalls);
      } else if(view === CALENDAR_CHANGE_VIEW[1]) {
        var bookedHalls = CommonService.findBookedHallsByWeek($scope.model.newBookings, date);
        chartSummary(bookedHalls);
      } else {    
        var bookedHalls = CommonService.findBookedHallsByMonth($scope.model.newBookings, date);
        chartSummary(bookedHalls);
      }
    };

    function findIndexByID(array, id) {
      return _.findIndex(array, function(o) { return o._id == id; });
    };


    /* config object */
    $scope.uiConfig = {
      calendar: {
        height: 510,
        editable: false,
        displayEventTime: false,
        header: {
          left: 'title',
          center: '',
          right: 'today prev,next'
        },
        dayClick: $scope.dayClick,
        eventDrop: $scope.alertOnDrop,
        eventResize: $scope.alertOnResize,
        eventClick: $scope.eventClick,
        viewRender: $scope.renderView
      }
    };

    /* event sources array*/
    $scope.eventSources = [$scope.model.events];

  }
}());