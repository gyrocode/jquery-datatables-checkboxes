/*! Checkboxes 1.2.11
 *  Copyright (c) Gyrocode (www.gyrocode.com)
 *  License: MIT License
 */

/**
 * @summary     Checkboxes
 * @description Checkboxes extension for jQuery DataTables
 * @version     1.2.11
 * @file        dataTables.checkboxes.js
 * @author      Gyrocode (http://www.gyrocode.com/projects/jquery-datatables-checkboxes/)
 * @contact     http://www.gyrocode.com/contacts
 * @copyright   Copyright (c) Gyrocode
 * @license     MIT License
 *
 * @contribute Nikitul (https://github.com/nikitul/)
 */

(function( factory ){
/* eslint-disable */
   if ( typeof define === 'function' && define.amd ) {
      // AMD
      define( ['jquery', 'datatables.net'], function ( $ ) {
         return factory( $, window, document );
      } );
   }
   else if ( typeof exports === 'object' ) {
      // CommonJS
      module.exports = function (root, $) {
         if ( ! root ) {
            root = window;
         }

         if ( ! $ || ! $.fn.dataTable ) {
            $ = require('datatables.net')(root, $).$;
         }

         return factory( $, root, root.document );
      };
   }
   else {
      // Browser
      factory( jQuery, window, document );
   }
/* eslint-enable */
}(function( $, window, document ) {
   'use strict';
   var DataTable = $.fn.dataTable;


   /**
   * Checkboxes is an extension for the jQuery DataTables library that provides
   * universal solution for working with checkboxes in a table.
   *
   *  @class
   *  @param {object} settings DataTables settings object for the host table
   *  @requires jQuery 1.7+
   *  @requires DataTables 1.10.8+
   *
   *  @example
   *     $('#example').DataTable({
   *        'columnDefs': [
   *           {
   *              'targets': 0,
   *              'checkboxes': true
   *           }
   *        ]
   *     });
   */
   var Checkboxes = function ( settings ) {
      // Sanity check that we are using DataTables 1.10.8 or newer
      if ( ! DataTable.versionCheck || ! DataTable.versionCheck( '1.10.8' ) ) {
         throw 'DataTables Checkboxes requires DataTables 1.10.8 or newer';
      }

      this.s = {
         dt: new DataTable.Api( settings ),
         columns: [],
         data: [],
         dataDisabled: [],
         ignoreSelect: false
      };

      // Get settings object
      this.s.ctx = this.s.dt.settings()[0];

      // Check if checkboxes have already been initialised on this table
      if ( this.s.ctx.checkboxes ) {
         return;
      }

      settings.checkboxes = this;

      this._constructor();
   };


   Checkboxes.prototype = {
      /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      * Constructor
      */

      /**
      * Initialise the Checkboxes instance
      *
      * @private
      */
      _constructor: function ()
      {
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;
         var hasCheckboxes = false;
         var hasCheckboxesSelectRow = false;

         for(var i = 0; i < ctx.aoColumns.length; i++){
            if (ctx.aoColumns[i].checkboxes){
               var $colHeader = $(dt.column(i).header());

               //
               // INITIALIZATION
               //

               hasCheckboxes = true;

               if(!$.isPlainObject(ctx.aoColumns[i].checkboxes)){
                  ctx.aoColumns[i].checkboxes = {};
               }

               ctx.aoColumns[i].checkboxes = $.extend(
                  {}, Checkboxes.defaults, ctx.aoColumns[i].checkboxes
               );

               //
               // OPTIONS
               //

               var colOptions = {
                  //'searchable': false, //not needed anymore
                  'orderable': false
               };

               if(ctx.aoColumns[i].sClass === ''){
                  colOptions['className'] = 'dt-checkboxes-cell';
               } else {
                  colOptions['className'] = ctx.aoColumns[i].sClass + ' dt-checkboxes-cell';
               }

               if(ctx.aoColumns[i].sWidthOrig === null){
                  colOptions['width'] = '1%';
               }

               if(ctx.aoColumns[i].mRender === null){
                  colOptions['render'] = function(){
                     return '<input type="checkbox" class="dt-checkboxes">';
                  };
               }

               DataTable.ext.internal._fnColumnOptions(ctx, i, colOptions);


               // WORKAROUND: Remove "sorting" class
               $colHeader.removeClass('sorting');

               // WORKAROUND: Detach all event handlers for this column
               $colHeader.off('.dt');

               // If table has data source other than Ajax
               if(ctx.sAjaxSource === null){
                  // WORKAROUND: Invalidate column data
                  var cells = dt.cells('tr', i);
                  cells.invalidate('data');

                  // WORKAROUND: Add required class to existing cells
                  $(cells.nodes()).addClass(colOptions['className']);
               }


               //
               // DATA
               //

               // Initialize object holding data for selected checkboxes
               self.s.data[i] = {};
               self.s.dataDisabled[i] = {};

               // Store column index for easy column selection later
               self.s.columns.push(i);


               //
               // CLASSES
               //

               // If row selection is enabled for this column
               if(ctx.aoColumns[i].checkboxes.selectRow){

                  // If Select extension is enabled
                  if(ctx._select){
                     hasCheckboxesSelectRow = true;

                  // Otherwise, if Select extension is not enabled
                  } else {
                     // Disable row selection for this column
                     ctx.aoColumns[i].checkboxes.selectRow = false;
                  }
               }

               // If "Select all" control is enabled
               if(ctx.aoColumns[i].checkboxes.selectAll){
                  // Save previous HTML content
                  $colHeader.data('html', $colHeader.html());

                  // If "Select all" control markup is provided
                  if(ctx.aoColumns[i].checkboxes.selectAllRender !== null){
                     var selectAllHtml = '';

                     // If "selectAllRender" option is a function
                     if($.isFunction(ctx.aoColumns[i].checkboxes.selectAllRender)){
                        selectAllHtml = ctx.aoColumns[i].checkboxes.selectAllRender();

                     // Otherwise, if "selectAllRender" option is a string
                     } else if(typeof ctx.aoColumns[i].checkboxes.selectAllRender === 'string'){
                        selectAllHtml = ctx.aoColumns[i].checkboxes.selectAllRender;
                     }

                     $colHeader
                        .html(selectAllHtml)
                        .addClass('dt-checkboxes-select-all')
                        .attr('data-col', i);
                  }
               }
            }
         }

         // If table has at least one checkbox column
         if(hasCheckboxes){

            // Load previous state
            self.loadState();

            //
            // EVENT HANDLERS
            //

            var $table = $(dt.table().node());
            var $tableBody = $(dt.table().body());
            var $tableContainer = $(dt.table().container());

            // If there is at least one column that has row selection enabled
            if(hasCheckboxesSelectRow){
               $table.addClass('dt-checkboxes-select');

               // Handle event before row is selected/deselected
               $table.on('user-select.dt.dtCheckboxes', function (e, dt, type, cell , originalEvent){
                  self.onDataTablesUserSelect(e, dt, type, cell , originalEvent);
               });

               // Handle row select/deselect event
               $table.on('select.dt.dtCheckboxes deselect.dt.dtCheckboxes', function(e, api, type, indexes){
                  self.onDataTablesSelectDeselect(e, type, indexes);
               });
               // Disable Select extension information display
               dt.select.info(false);

               // Update the table information element with selected item summary
               //
               // NOTE: Needed to display correct count of selected rows
               // when using server-side processing mode
               $table.on('draw.dt.dtCheckboxes select.dt.dtCheckboxes deselect.dt.dtCheckboxes', function(){
                  self.showInfoSelected();
               });
            }

            // Handle table draw event
            $table.on('draw.dt.dtCheckboxes', function(e){
               self.onDataTablesDraw(e);
            });

            // Handle checkbox click event
            $tableBody.on('click.dtCheckboxes', 'input.dt-checkboxes', function(e){
               self.onClick(e, this);
            });

            // Handle click on "Select all" control
            $tableContainer.on('click.dtCheckboxes', 'thead th.dt-checkboxes-select-all input[type="checkbox"]', function(e){
               self.onClickSelectAll(e, this);
            });

            // Handle click on heading containing "Select all" control
            $tableContainer.on('click.dtCheckboxes', 'thead th.dt-checkboxes-select-all', function() {
               $('input[type="checkbox"]', this).not(':disabled').trigger('click');
            });

            // If row selection is disabled
            if(!hasCheckboxesSelectRow){
               // Handle click on cell containing checkbox
               $tableContainer.on('click.dtCheckboxes', 'tbody td.dt-checkboxes-cell', function() {
                  $('input[type="checkbox"]', this).not(':disabled').trigger('click');
               });
            }

            // Handle click on label node in heading containing "Select all" control
            // and in cell containing checkbox
            $tableContainer.on('click.dtCheckboxes', 'thead th.dt-checkboxes-select-all label, tbody td.dt-checkboxes-cell label', function(e) {
               // Prevent default behavior
               e.preventDefault();
            });

            // Handle click on "Select all" control in floating fixed header
            $(document).on('click.dtCheckboxes', '.fixedHeader-floating thead th.dt-checkboxes-select-all input[type="checkbox"]', function(e){
               // If FixedHeader is enabled in this instance
               if(ctx._fixedHeader){
                  // If header is floating in this instance
                  if(ctx._fixedHeader.dom['header'].floating){
                     self.onClickSelectAll(e, this);
                  }
               }
            });

            // Handle click on heading containing "Select all" control in floating fixed header
            $(document).on('click.dtCheckboxes', '.fixedHeader-floating thead th.dt-checkboxes-select-all', function() {
               // If FixedHeader is enabled in this instance
               if(ctx._fixedHeader){
                  // If header is floating in this instance
                  if(ctx._fixedHeader.dom['header'].floating){
                     $('input[type="checkbox"]', this).trigger('click');
                  }
               }
            });

            // Handle table initialization event
            $table.on('init.dt.dtCheckboxes', function(){
               self.onDataTablesInit();
            });

            // Handle state saving event
            $table.on('stateSaveParams.dt.dtCheckboxes', function (e, settings, data) {
               self.onDataTablesStateSave(e, settings, data);
            });

            // Handle table destroy event
            $table.one('destroy.dt.dtCheckboxes', function(e, settings){
               self.onDataTablesDestroy(e, settings);
            });
         }
      },

      // Handles DataTables initialization event
      onDataTablesInit: function(){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If server-side processing mode is not enabled
         // NOTE: Needed to avoid duplicate call to updateStateCheckboxes() in onDataTablesDraw()
         if(!ctx.oFeatures.bServerSide){

            // If state saving is enabled
            if(ctx.oFeatures.bStateSave){
               self.updateState();
            }

            // Handle Ajax request completion event
            // NOTE: Needed to update table state
            // if table is reloaded via ajax.reload() API method
            $(dt.table().node()).on('xhr.dt.dtCheckboxes', function ( e, settings , json, xhr ) {
               self.onDataTablesXhr(e. settings, json, xhr);
            });
         }
      },

      // Handles DataTables user initiated select event
      onDataTablesUserSelect: function ( e, dt, type, cell /*, originalEvent*/ ){
         var self = this;
         var ctx = self.s.ctx;

         var cellIdx = cell.index();
         var rowIdx = cellIdx.row;
         var colIdx = self.getSelectRowColIndex();
         var pluginId = ( ctx.rowId ? dt.cell({ row: rowIdx, column: colIdx }).row().id() : dt.cell({ row: rowIdx, column: colIdx }).data() );

         // If checkbox in the cell cannot be checked
         if(!self.isCellSelectable(colIdx, pluginId)){
            // Prevent row selection
            e.preventDefault();
         }
      },

      // Handles DataTables row select/deselect event
      onDataTablesSelectDeselect: function(e, type, indexes){
         var self = this;
         var dt = self.s.dt;

         if(self.s.ignoreSelect){ return; }

         if(type === 'row'){
            // Get index of the first column that has checkbox and row selection enabled
            var colIdx = self.getSelectRowColIndex();
            if(colIdx !== null){
               var cells = dt.cells(indexes, colIdx);

               self.updateData(cells, colIdx, (e.type === 'select') ? true : false);
               self.updateCheckbox(cells, colIdx, (e.type === 'select') ? true : false);
               self.updateSelectAll(colIdx);
            }
         }
      },

      // Handles DataTables state save event
      onDataTablesStateSave: function (e, settings, data) {
         var self = this;
         var ctx = self.s.ctx;

         // Initialize array holding checkbox state for each column
         data.checkboxes = [];

         // For every column where checkboxes are enabled
         $.each(self.s.columns, function(index, colIdx){
            // If checkbox state saving is enabled
            if(ctx.aoColumns[colIdx].checkboxes.stateSave){
               // Store data associated with this plug-in
               data.checkboxes[colIdx] = self.s.data[colIdx];
            }
         });
      },

      // Handles DataTables destroy event
      onDataTablesDestroy: function(){
         var self = this;
         var dt = self.s.dt;

         // Get table elements
         var $table = $(dt.table().node());
         var $tableBody = $(dt.table().body());
         var $tableContainer = $(dt.table().container());

         // Detach event handlers
         $(document).off('click.dtCheckboxes');
         $tableContainer.off('.dtCheckboxes');
         $tableBody.off('.dtCheckboxes');
         $table.off('.dtCheckboxes');

         // Clear data
         //
         // NOTE: Needed only to reduce memory footprint
         // in case user saves instance of DataTable object.
         self.s.data = {};
         self.s.dataDisabled = {};

         // Remove added elements
         $('.dt-checkboxes-select-all', $table).each(function(index, el){
            $(el)
               .html($(el).data('html'))
               .removeClass('dt-checkboxes-select-all');
         });
      },

      // Handles DataTables draw event
      onDataTablesDraw: function(){
         var self = this;
         var ctx = self.s.ctx;

         // If server-side processing is enabled
         // or deferred render is enabled
         //
         // TODO: it's not optimal to update state of checkboxes
         // for already created rows in deferred rendering mode
         if(ctx.oFeatures.bServerSide || ctx.oFeatures.bDeferRender){
            self.updateStateCheckboxes({ page: 'current', search: 'none' });
         }

         $.each(self.s.columns, function(index, colIdx){
           // If FixedColumns extension is enabled
           if(ctx._oFixedColumns){
              // Use timeout to let FixedColumns construct the header
              // before we update the "Select all" checkbox
              setTimeout(function(){ ctx.checkboxes.updateSelectAll(colIdx); }, 0);

           } else {
              ctx.checkboxes.updateSelectAll(colIdx);
           }
         });
      },

      // Handles DataTables Ajax request completion event
      onDataTablesXhr: function( /* e, settings , json, xhr */ ){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // Get table elements
         var $table = $(dt.table().node());

         // For every column where checkboxes are enabled
         $.each(self.s.columns, function(index, colIdx){
            // Reset data
            self.s.data[colIdx] = {};
            self.s.dataDisabled[colIdx] = {};
         });

         // If state saving is enabled
         if(ctx.oFeatures.bStateSave){
            // Load previous state
            self.loadState();

            // Update table state on next redraw
            $table.one('draw.dt.dtCheckboxes', function(){
               self.updateState();
            });
         }
      },

      // Updates array holding data for selected checkboxes
      updateData: function(cells, colIdx, isSelected){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var pluginIds = ( ctx.rowId ? dt.rows(cells.nodes()).ids() : cells.data() );
            var cellsVal = cells.data();
            var rowsVal = dt.rows(cells.nodes()).data();

            pluginIds.each(function(pluginId, index){
               // If checkbox is checked
               if(isSelected){
                  ctx.checkboxes.s.data[colIdx][pluginId] = { cell: cellsVal[index], row: rowsVal[index] };

               // Otherwise, if checkbox is not checked
               } else {
                  delete ctx.checkboxes.s.data[colIdx][pluginId];
               }
            });

            // If state saving is enabled
            if(ctx.oFeatures.bStateSave){
               // If checkbox state saving is enabled
               if(ctx.aoColumns[colIdx].checkboxes.stateSave){
                  // Save state
                  dt.state.save();
               }
            }
         }
      },

      // Updates row selection
      updateSelect: function(selector, isSelected){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If Select extension is enabled
         if(ctx._select){
            // Disable select event hanlder temporarily
            self.s.ignoreSelect = true;

            if(isSelected){
               dt.rows(selector).select();
            } else {
               dt.rows(selector).deselect();
            }

            // Re-enable select event handler
            self.s.ignoreSelect = false;
         }
      },

      // Updates state of single checkbox
      updateCheckbox: function(cells, colIdx, isSelected){
         var self = this;
         var ctx = self.s.ctx;

         var cellNodes = cells.nodes();
         if(cellNodes.length){
            $('input.dt-checkboxes', cellNodes).not(':disabled').prop('checked', isSelected);

            // If selectCallback is a function
            if($.isFunction(ctx.aoColumns[colIdx].checkboxes.selectCallback)){
               ctx.aoColumns[colIdx].checkboxes.selectCallback(cellNodes, isSelected);
            }
         }
      },

      // Update table state
      updateState: function(){
         var self = this;

         self.updateStateCheckboxes({ page: 'all', search: 'none' });

         $.each(self.s.columns, function(index, colIdx){
            self.updateSelectAll(colIdx);
         });
      },

      // Updates state of multiple checkboxes
      updateStateCheckboxes: function(opts){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // Enumerate all cells
         dt.cells('tr', self.s.columns, opts).every(function(rowIdx, colIdx){
            // Get cell data dt.cell({ row: rowIdx, column: colIdx })
            var pluginId = ( ctx.rowId ? this.row(rowIdx).id() : this.data() );

            // Determine if checkbox in the cell can be selected
            var isCellSelectable = self.isCellSelectable(colIdx, pluginId);

            // If checkbox is checked
            if(ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
               self.updateCheckbox(this, colIdx, true);

               // If row selection is enabled
               // and checkbox can be checked
               if(ctx.aoColumns[colIdx].checkboxes.selectRow && isCellSelectable){
                  self.updateSelect(rowIdx, true);
               }
            }

            // If checkbox is disabled
            if(!isCellSelectable){
               $('input.dt-checkboxes', this.node()).prop('disabled', true);
            }
         });
      },

      // Handles checkbox click event
      onClick: function(e, ctrl){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         var cellSelector;

         // Get cell
         var $cell = $(ctrl).closest('td');

         var cell    = dt.cell($cell);
         var cellIdx = cell.index();
         var colIdx  = cellIdx.column;

         // If row selection is not enabled
         // NOTE: if row selection is enabled, checkbox selection/deselection
         // would be handled by onDataTablesSelectDeselect event handler instead
         if(!ctx.aoColumns[colIdx].checkboxes.selectRow){
            cell.checkboxes.select(ctrl.checked);

            // Prevent click event from propagating to parent
            e.stopPropagation();

         } else {
            // WORKAROUND:
            // Select extension may keep the row selected
            // when checkbox is unchecked with SHIFT key.
            //
            // We need to update the state of the checkbox AFTER handling
            // select/deselect event from Select extension.
            //
            // Call to setTimeout is needed to let select/deselect event handler
            // update the data first.
            setTimeout(function(){
               // Get cell data
               var pluginId = ( ctx.rowId ? cell.row().id() : cell.data() );

               // Determine whether data is in the list
               var hasData = self.s.data[colIdx].hasOwnProperty(pluginId);

               // If state of the checkbox needs to be updated
               if(hasData !== ctrl.checked){
                  self.updateCheckbox(cell, colIdx, hasData);
                  self.updateSelectAll(colIdx);
               }
            }, 0);
         }
      },

      // Handles checkbox click event
      onClickSelectAll: function(e, ctrl){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // Calculate column index
         var colIdx = null;
         var $th = $(ctrl).closest('th');


         // If column is fixed using FixedColumns extension
         if($th.parents('.DTFC_Cloned').length){
            colIdx = $($th).data('col');
         } else {
            colIdx = dt.column($th).index();
         }

         // Indicate that state of "Select all" control has been changed
         $(ctrl).data('is-changed', true);

         dt.column(colIdx, {
            page: (
               (ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectAllPages)
                  ? 'all'
                  : 'current'
            ),
            search: 'applied'
         }).checkboxes.select(ctrl.checked);

         // Prevent click event from propagating to parent
         e.stopPropagation();
      },

      // Loads previosly saved sate
      loadState: function () {
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If state saving is enabled
         if(ctx.oFeatures.bStateSave){
            // Retrieve stored state
            var state = dt.state.loaded();

            // For every column where checkboxes are enabled
            $.each(self.s.columns, function(index, colIdx){
               // If state is loaded and contains data for this column
               if(state && state.checkboxes && state.checkboxes.hasOwnProperty(colIdx)){
                  // If checkbox state saving is enabled
                  if(ctx.aoColumns[colIdx].checkboxes.stateSave){
                     // Load previous state
                     self.s.data[colIdx] = state.checkboxes[colIdx];
                  }
               }
            });
         }
      },

      // Updates state of the "Select all" controls
      updateSelectAll: function(colIdx){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If Checkboxes extension is enabled for this column
         // and "Select all" control is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectAll){
            var cells = dt.cells('tr', colIdx, {
               page: (
                  (ctx.aoColumns[colIdx].checkboxes.selectAllPages)
                     ? 'all'
                     : 'current'
               ),
               search: 'applied'
            });

            var $tableContainer = dt.table().container();
            var $checkboxesSelectAll = $('.dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]', $tableContainer);

            var countChecked = 0;
            var countDisabled = 0;
            var pluginIds = ( ctx.rowId ? dt.rows(cells.nodes()).ids() : cells.data() );

            $.each(pluginIds, function(index, pluginId){
               // If checkbox is not disabled
               if(self.isCellSelectable(colIdx, pluginId)){

                  if(self.s.data[colIdx].hasOwnProperty(pluginId)){ countChecked++; }

               // Otherwise, if checkbox is disabled
               } else {
                  countDisabled++;
               }
            });

            // If FixedHeader is enabled in this instance
            if(ctx._fixedHeader){
               // If header is floating in this instance
               if(ctx._fixedHeader.dom['header'].floating){
                  $checkboxesSelectAll = $('.fixedHeader-floating .dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]');
               }
            }

            // If FixedColumns is enabled in this instance
            if( (ctx._oFixedColumns) && !(ctx._fixedHeader) ){
              if (colIdx < ctx._oFixedColumns.s.iLeftColumns){
                $checkboxesSelectAll = $('.dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]', ctx._oFixedColumns.dom.clone.left['header']);
              }

              if (colIdx > (ctx._oFixedColumns.s.iTableColumns - ctx._oFixedColumns.s.iRightColumns - 1) ){
                $checkboxesSelectAll = $('.dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]', ctx._oFixedColumns.dom.clone.right['header']);
              }
            }

            var isSelected;
            var isIndeterminate;

            // If none of the checkboxes are checked
            if (countChecked === 0){
               isSelected      = false;
               isIndeterminate = false;

            // If all of the checkboxes are checked
            } else if ((countChecked + countDisabled) === pluginIds.length){
               isSelected      = true;
               isIndeterminate = false;

            // If some of the checkboxes are checked
            } else {
               isSelected      = true;
               isIndeterminate = true;
            }

            var isChanged          = $checkboxesSelectAll.data('is-changed');
            var isSelectedNow      = $checkboxesSelectAll.prop('checked');
            var isIndeterminateNow = $checkboxesSelectAll.prop('indeterminate');

            // If state of "Select all" control has been changed
            if(isChanged || isSelectedNow !== isSelected || isIndeterminateNow !== isIndeterminate){
               // Reset "Select all" control state flag
               $checkboxesSelectAll.data('is-changed', false);

               $checkboxesSelectAll.prop({
                  'checked': isSelected,
                  'indeterminate': isIndeterminate
               });

               // If selectAllCallback is a function
               if($.isFunction(ctx.aoColumns[colIdx].checkboxes.selectAllCallback)){
                  ctx.aoColumns[colIdx].checkboxes.selectAllCallback($checkboxesSelectAll.closest('th').get(0), isSelected, isIndeterminate);
               }
            }
         }
      },

      // Updates the information element of the DataTable showing information about the
      // items selected. Based on info() method of Select extension.
      showInfoSelected: function(){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         if ( ! ctx.aanFeatures.i ) {
            return;
         }

         // Get index of the first column that has checkbox and row selection enabled
         var colIdx = self.getSelectRowColIndex();

         // If there is a column that has checkbox and row selection enabled
         if(colIdx !== null){
            // Count number of selected rows
            var countRows = 0;
            for (var pluginId in ctx.checkboxes.s.data[colIdx]){
               if (ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
                  countRows++;
               }
            }

            var add = function($el, name, num){
               $el.append( $('<span class="select-item"/>').append( dt.i18n(
                  'select.'+name+'s',
                  { _: '%d '+name+'s selected', 0: '', 1: '1 '+name+' selected' },
                  num
               ) ) );
            };

            // Internal knowledge of DataTables to loop over all information elements
            $.each( ctx.aanFeatures.i, function ( i, el ) {
               var $el = $(el);

               var $output  = $('<span class="select-info"/>');
               add($output, 'row', countRows);

               var $existing = $el.children('span.select-info');
               if($existing.length){
                  $existing.remove();
               }

               if($output.text() !== ''){
                  $el.append($output);
               }
            });
         }
      },

      // Determines whether checkbox in the cell can be checked
      isCellSelectable: function(colIdx, pluginId){
         var self = this;
         var ctx = self.s.ctx;

         // If data is in the list of disabled elements
         if(ctx.checkboxes.s.dataDisabled[colIdx].hasOwnProperty(pluginId)){
            return false;

         // Otherwise, if checkbox can be selected
         } else {
            return true;
         }
      },

      // Gets cell index
      getCellIndex: function(cell){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

        return dt.cell(cell).index();
      },

      // Gets index of the first column that has checkbox and row selection enabled
      getSelectRowColIndex: function(){
         var self = this;
         var ctx = self.s.ctx;

         var colIdx = null;

         for(var i = 0; i < ctx.aoColumns.length; i++){
            // If Checkboxes extension is enabled
            // and row selection is enabled for this column
            if(ctx.aoColumns[i].checkboxes && ctx.aoColumns[i].checkboxes.selectRow){
               colIdx = i;
               break;
            }
         }

         return colIdx;
      },

      // Updates fixed column if FixedColumns extension is enabled
      // and given column is inside a fixed column
      updateFixedColumn: function(colIdx){
         var self = this;
         var dt = self.s.dt;
         var ctx = self.s.ctx;

         // If FixedColumns extension is enabled
         if(ctx._oFixedColumns){
            var leftCols = ctx._oFixedColumns.s.iLeftColumns;
            var rightCols = ctx.aoColumns.length - ctx._oFixedColumns.s.iRightColumns - 1;
            if (colIdx < leftCols || colIdx > rightCols){
               dt.fixedColumns().update();
            }
         }
      }
   };


   /**
   * Checkboxes default settings for initialisation
   *
   * @namespace
   * @name Checkboxes.defaults
   * @static
   */
   Checkboxes.defaults = {
      /**
      * Enable / disable checkbox state loading/saving if state saving is enabled globally
      *
      * @type {Boolean}
      * @default `true`
      */
      stateSave: true,

      /**
      * Enable / disable row selection
      *
      * @type {Boolean}
      * @default `false`
      */
      selectRow: false,

      /**
      * Enable / disable "select all" control in the header
      *
      * @type {Boolean}
      * @default `true`
      */
      selectAll: true,

      /**
      * Enable / disable ability to select checkboxes from all pages
      *
      * @type {Boolean}
      * @default `true`
      */
      selectAllPages: true,

      /**
      * Checkbox select/deselect callback
      *
      * @type {Function}
      * @default  `null`
      */
      selectCallback: null,

      /**
      * "Select all" control select/deselect callback
      *
      * @type {Function}
      * @default  `null`
      */
      selectAllCallback: null,

      /**
      * "Select all" control markup
      *
      * @type {mixed}
      * @default `<input type="checkbox">`
      */
      selectAllRender: '<input type="checkbox">'
   };


   /*
   * API
   */
   var Api = $.fn.dataTable.Api;

   // Doesn't do anything - work around for a bug in DT... Not documented
   Api.register( 'checkboxes()', function () {
      return this;
   } );

   Api.registerPlural( 'columns().checkboxes.select()', 'column().checkboxes.select()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }

      return this.iterator( 'column-rows', function ( ctx, colIdx, i, j, rowsIdx ) {
         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            // Prepare a list of all cells
            var selector = [];
            $.each(rowsIdx, function(index, rowIdx){
               selector.push({ row: rowIdx, column: colIdx });
            });

            var cells = this.cells(selector);
            var pluginIds = ( ctx.rowId ? this.rows(cells.nodes()).ids() : cells.data() );
            // changed on id //var cellsData = cells.data();

            // Prepare a list of cells that contain checkboxes that can be selected
            var rowsSelectableIdx = [];
            selector = [];
            $.each(pluginIds, function(index, pluginId){
               // If checkbox in the cell can be selected
               if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                  selector.push({ row: rowsIdx[index], column: colIdx });
                  rowsSelectableIdx.push(rowsIdx[index]);
               }
            });

            cells = this.cells(selector);

            ctx.checkboxes.updateData(cells, colIdx, state);
            ctx.checkboxes.updateCheckbox(cells, colIdx, state);

            // If row selection is enabled
            if(ctx.aoColumns[colIdx].checkboxes.selectRow){
               ctx.checkboxes.updateSelect(rowsSelectableIdx, state);
            }

            // If FixedColumns extension is enabled
            if(ctx._oFixedColumns){
               // Use timeout to let FixedColumns construct the header
               // before we update the "Select all" checkbox
               setTimeout(function(){ ctx.checkboxes.updateSelectAll(colIdx); }, 0);

            } else {
               ctx.checkboxes.updateSelectAll(colIdx);
            }

            ctx.checkboxes.updateFixedColumn(colIdx);
         }
      }, 1 );
   } );

   Api.registerPlural( 'cells().checkboxes.select()', 'cell().checkboxes.select()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }

      return this.iterator( 'cell', function ( ctx, rowIdx, colIdx ) {
         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var cells = this.cells([{ row: rowIdx, column: colIdx }]);
            var pluginId = ( ctx.rowId ? this.cell({ row: rowIdx, column: colIdx }).row().id() : this.cell({ row: rowIdx, column: colIdx }).data() );

            // If checkbox in the cell can be selected
            if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
               ctx.checkboxes.updateData(cells, colIdx, state);
               ctx.checkboxes.updateCheckbox(cells, colIdx, state);

               // If row selection is enabled
               if(ctx.aoColumns[colIdx].checkboxes.selectRow){
                  ctx.checkboxes.updateSelect(rowIdx, state);
               }

               // If FixedColumns extension is enabled
               if(ctx._oFixedColumns){
                  // Use timeout to let FixedColumns construct the header
                  // before we update the "Select all" checkbox
                  setTimeout(function(){ ctx.checkboxes.updateSelectAll(colIdx); }, 0);

               } else {
                  ctx.checkboxes.updateSelectAll(colIdx);
               }

               ctx.checkboxes.updateFixedColumn(colIdx);
            }
         }
      }, 1 );
   } );

   Api.registerPlural( 'cells().checkboxes.enable()', 'cell().checkboxes.enable()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }

      return this.iterator( 'cell', function ( ctx, rowIdx, colIdx ) {
         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var cell = this.cell({ row: rowIdx, column: colIdx });

            // Get cell data
            var pluginId = ( ctx.rowId ? cell.row().id() : cell.data() );
            var cellVal = cell.data();
            var rowVal = this.row(cell.node()).data();

            // If checkbox should be enabled
            if(state){
               delete ctx.checkboxes.s.dataDisabled[colIdx][pluginId];

            // Otherwise, if checkbox should be disabled
            } else {
               ctx.checkboxes.s.dataDisabled[colIdx][pluginId] = {cell: cellVal, row: rowVal};
            }


            // Determine if cell node is available
            // (deferRender is not enabled or cell has been already created)
            var cellNode = cell.node();
            if(cellNode){
               $('input.dt-checkboxes', cellNode).prop('disabled', !state);
            }

            // If row selection is enabled
            // and checkbox can be checked
            if(ctx.aoColumns[colIdx].checkboxes.selectRow){
               // If data is in the list
               if(ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
                  // Update selection based on current state:
                  // if checkbox is enabled then select row;
                  // otherwise, deselect row
                  ctx.checkboxes.updateSelect(rowIdx, state);
               }
            }
         }
      }, 1 );
   } );

   Api.registerPlural( 'cells().checkboxes.disable()', 'cell().checkboxes.disable()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }
      return this.checkboxes.enable(!state);
   } );

   Api.registerPlural( 'columns().checkboxes.deselect()', 'column().checkboxes.deselect()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }
      return this.checkboxes.select(!state);
   } );

   Api.registerPlural( 'cells().checkboxes.deselect()', 'cell().checkboxes.deselect()', function ( state ) {
      if(typeof state === 'undefined'){ state = true; }
      return this.checkboxes.select(!state);
   } );

   Api.registerPlural( 'columns().checkboxes.deselectAll()', 'column().checkboxes.deselectAll()', function () {
      return this.iterator( 'column', function (ctx, colIdx){
         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            ctx.checkboxes.s.data[colIdx] = {};

            this.column(colIdx).checkboxes.select(false);
         }
      }, 1 );
   } );

   Api.registerPlural( 'columns().checkboxes.selected()', 'column().checkboxes.selected()', function () {
      return this.iterator( 'column-rows', function ( ctx, colIdx, i, j, rowsIdx ) {

         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var data = [];

            // If server-side processing mode is enabled
            if(ctx.oFeatures.bServerSide){
                $.each(ctx.checkboxes.s.data[colIdx], function(pluginId, pluginData){
                  // If checkbox in the cell can be checked
                  if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                     data.push(pluginData.cell);
                  }
               });

            // Otherwise, if server-side processing mode is not enabled
            } else {
               // Prepare a list of all cells
               var selector = [];
               $.each(rowsIdx, function(index, rowIdx){
                  selector.push({ row: rowIdx, column: colIdx });
               });

               // Get all cells data
               var cells = this.cells(selector);
               var pluginIds = ( ctx.rowId ? this.rows(cells.nodes()).ids() : cells.data() );
               var cellsVal = cells.data();
               //var rowsVal = this.rows(cells.nodes()).data();

               // Enumerate all cells data
               $.each(pluginIds, function(index, pluginId){
                  // If checkbox is checked
                  if(ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
                     // If checkbox in the cell can be selected
                     if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                        data.push(cellsVal[index]);
                     }
                  }
               });

            }

            return data;

         } else {
            return [];
         }
      }, 1 );
   } );

   Api.registerPlural( 'columns().checkboxes.ids()', 'column().checkboxes.ids()', function () {
      return this.iterator( 'column-rows', function ( ctx, colIdx, i, j, rowsIdx ) {

         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var data = [];

            // If server-side processing mode is enabled
            if(ctx.oFeatures.bServerSide){
                $.each(ctx.checkboxes.s.data[colIdx], function(pluginId, pluginData){
                  // If checkbox in the cell can be checked
                  if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                     data.push(pluginId);
                  }
               });

            // Otherwise, if server-side processing mode is not enabled
            } else {
               // Prepare a list of all cells
               var selector = [];
               $.each(rowsIdx, function(index, rowIdx){
                  selector.push({ row: rowIdx, column: colIdx });
               });

               // Get all cells data
               var cells = this.cells(selector);
               var pluginIds = this.rows(cells.nodes()).ids();
               //var cellsVal = cells.data();
               //var rowsVal = this.rows(cells.nodes()).data();

               // Enumerate all cells data
               $.each(pluginIds, function(index, pluginId){
                  // If checkbox is checked
                  if(ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
                     // If checkbox in the cell can be selected
                     if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                        data.push(pluginId);
                     }
                  }
               });

            }

            return data;

         } else {
            return [];
         }
      }, 1 );
   } );

   Api.registerPlural( 'columns().checkboxes.data()', 'column().checkboxes.data()', function () {
      return this.iterator( 'column-rows', function ( ctx, colIdx, i, j, rowsIdx ) {

         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[colIdx].checkboxes){
            var data = [];

            // If server-side processing mode is enabled
            if(ctx.oFeatures.bServerSide){
                $.each(ctx.checkboxes.s.data[colIdx], function(pluginId, pluginData){
                  // If checkbox in the cell can be checked
                  if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                     data.push(pluginData.row);
                  }
               });

            // Otherwise, if server-side processing mode is not enabled
            } else {
               // Prepare a list of all cells
               var selector = [];
               $.each(rowsIdx, function(index, rowIdx){
                  selector.push({ row: rowIdx, column: colIdx });
               });

               // Get all cells data
               var cells = this.cells(selector);
               var pluginIds = ( ctx.rowId ? this.rows(cells.nodes()).ids() : cells.data() );
               var cellsVal = cells.data();
               var rowsVal = this.rows(cells.nodes()).data();

               // Enumerate all cells data
               $.each(pluginIds, function(index, pluginId){
                  // If checkbox is checked
                  if(ctx.checkboxes.s.data[colIdx].hasOwnProperty(pluginId)){
                     // If checkbox in the cell can be selected
                     if(ctx.checkboxes.isCellSelectable(colIdx, pluginId)){
                        data.push(rowsVal[index]);
                     }
                  }
               });

            }

            return data;

         } else {
            return [];
         }
      }, 1 );
   } );


   /**
   * Version information
   *
   * @name Checkboxes.version
   * @static
   */
   Checkboxes.version = '1.2.11';



   $.fn.DataTable.Checkboxes = Checkboxes;
   $.fn.dataTable.Checkboxes = Checkboxes;


   // Attach a listener to the document which listens for DataTables initialisation
   // events so we can automatically initialise
   $(document).on( 'preInit.dt.dtCheckboxes', function (e, settings /*, json */ ) {
      if ( e.namespace !== 'dt' ) {
         return;
      }

      new Checkboxes( settings );
   } );


   return Checkboxes;
}));
