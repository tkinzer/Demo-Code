angular.module('ima-web-client')
    .controller('RegistrationWorkflowCtrl', ['$scope', '$rootScope', '$timeout', '$http', 'url',
        function ($scope, $rootScope, $timeout, $http, $url) {
            $scope.$parent.route = $scope.pages[$scope.current].route;
            $scope.$parent.control = $scope.pages[$scope.current].controller;
            $scope.lastStep;
            $scope.firstStep;
            $scope.color = '';
            $scope.showFlash = false;
            $scope.eventClosed = false;
            $scope.eventId = '';

            $scope.isCustomBackground = false,
                $scope.isCustomSideBanner = false,
                $scope.isCustomTopBanner = false;

            $scope.init = () => {

                $scope.eventId = $scope.event;
                $scope.getHeaderDetails();
                $scope.getPageSettings();
                
            }

           
            if ($scope.current === 0) {
                $scope.firstStep = true;
            } else {
                $scope.firstStep = false;
            }

            if ($scope.current === $scope.pages.length - 1) {
                $scope.lastStep = true;
            } else {
                $scope.lastStep = false;
            }

            $scope.getButtonText = function () {
                if ($scope.lastStep) {
                    return "Submit";
                }
                return "Next";
            }

            $scope.getPageSettings = () => {
                var url = '/Registration/Event/' + $scope.eventId + '/Customization/';
                $http.get($url.api(url), {}).then(
                    function successCallback(response) {
                        $scope.buildPage(response.data.content);
                    }, function errorCallback(response) {
                        console.log('Error retrieving search results');
                    }
                );
            }
            $scope.buildPage = function (settings) {
                console.log("...... Building Page .....", settings);
                $scope.pageSettings = settings;
                if (settings.background === undefined) {
                    $scope.pageSettings.background = settings.backGround;
                }
                if ($scope.pageSettings.background.imageBlobUrl !== null || $scope.pageSettings.background.backgroundColor !== null) {
                    $scope.isCustomBackground = true;
                }
                if ($scope.pageSettings.topBanner.imageBlobUrl !== null || $scope.pageSettings.topBanner.backgroundColor !== null) {
                    $scope.isCustomTopBanner = true;
                }
                if ($scope.pageSettings.sideBanner.imageBlobUrl !== null || $scope.pageSettings.sideBanner.backgroundColor !== null) {
                    $scope.isCustomSideBanner = true;
                }

            }

            $scope.getHeaderDetails = () => {
                var url = '/Event/' + $scope.eventId + '/Summary/';
                $http.get($url.api(url), {}).then(
                    function successCallback(response) {
                        $scope.buildHeader(response.data);
                    },
                    function errorCallback(response) {
                        console.log('Error retrieving search results');
                    }
                );
            }
            $scope.buildHeader = function (details) {
                console.log(".... Building header ....", details);
                $scope.details = details.content;
                if ($scope.details.startDate) {
                    var dt = new Date($scope.details.startDate);
                    $scope.details.startDate = formatDate(dt);
                    var todaysDate = new Date();
                    if (todaysDate.getTime() >= dt.getTime()) {
                        $scope.eventClosed = true;
                    }
                }
                    
                $scope.details.helpText = '#';
            }

            $scope.nextStep = function () {
                $rootScope.$broadcast('trigger-validate', { pageLabel: $scope.pages[$scope.current].label });
                //TODO: child scope with event listener for 'trigger-validate' to validate form and post data
            };

            $scope.previousStep = function () {
                $scope.current--;
                if ($scope.current !== 0) {
                    $scope.lastStep = false;

                } else {
                    $scope.firstStep = true;
                }
                $scope.$broadcast('change-current', { currentStep: $scope.current });
                $scope.$parent.route = $scope.pages[$scope.current].route;
                $scope.$parent.control = $scope.pages[$scope.current].controller;
            };

            //testing purposes
            //$scope.$on('trigger-validate',
            //    function (e, args) {
            //        $rootScope.$broadcast('allow-next-step', { valid: true });
            //    });
            //end testing
            $scope.$on('allow-next-step',
                function (e, args) {
                    if (args.valid) {
                        $scope.current++;
                        $scope.flashMessage.forSuccess("Registration Saved");
                        if ($scope.current !== $scope.pages.length - 1) {
                            $scope.firstStep = false;

                        } else {
                            $scope.lastStep = true;
                        }
                        $scope.$broadcast('change-current',
                            {
                                currentStep: $scope.current
                            });
                        $scope.$parent.route = $scope.pages[$scope.current].route;
                        $scope.$parent.control = $scope.pages[$scope.current].controller;
                    } else {
                       //$scope.flashMessage.forError("Incorrect fields. Please correct any highlighted fields.");
                    }
                });


            $scope.init();

            //$timeout(function() {
            //    $scope.flashMessage.forError("TEST ERROR");
            //    },
            //    200);
            function formatDate(date, compare) {
                var monthNames = [
                  "January", "February", "March",
                  "April", "May", "June", "July",
                  "August", "September", "October",
                  "November", "December"
                ];

                var day = date.getDate();
                var monthIndex = date.getMonth();
                var year = date.getFullYear();

                var fullDate = day + ' ' + monthNames[monthIndex] + ' ' + year;
                console.log("Formatted Date: ", fullDate);
                return fullDate;
            }
        }])
    .directive('registrationWorkflow', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'AE',
            templateUrl: 'app/templates/widgets/registration-workflow.html',
            controller: 'RegistrationWorkflowCtrl',
            scope: {
                event: '=event',
                pages: '=pages',
                current: '=current',
                helpText: '=helpText',
                fill: '=fill',
                data: '=data',
            },
            transclude: true,
            replace: true,
            link: function (scope, elem, attr) {
                
            }

        }
    }]);