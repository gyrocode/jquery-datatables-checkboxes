/*! Checkboxes 1.2.0-dev
 *  Copyright (c) Gyrocode (www.gyrocode.com)
 *  License: MIT License
 */

/**
 * @summary     Checkboxes
 * @description Checkboxes extension for jQuery DataTables
 * @version     1.2.0-dev
 * @file        dataTables.checkboxes.js
 * @author      Gyrocode (http://www.gyrocode.com/projects/jquery-datatables-checkboxes/)
 * @contact     http://www.gyrocode.com/contacts
 * @copyright   Copyright (c) Gyrocode
 * @license     MIT License
 */

(function( factory ){
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
}(function( $, window, document, undefined ) {
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
      data: {},
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

      // Retrieve stored state
      var state = dt.state.loaded(),
          rowClass = 'dt-checkboxes';

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
            // CHECKBOX INPUT VALIDATION
            //

            var checkbox = ctx.aoColumns[i].checkboxes.checkboxElement.replace(/\s+/g, ' '),
                checkbox_header,
                checkbox_table;

            if($(checkbox).is('input')){
               checkbox_header = checkbox_table = checkbox;

               // if regular input or not wrapped input next with an element
               // example:
               // '<input type="checkbox">\
               // <span></span>'
               // only input will be returned

               checkbox_table = $(checkbox_table).addClass(rowClass).get(0).outerHTML;
               checkbox_header = $(checkbox_header).get(0).outerHTML;
            } else if ($(checkbox).find('input').length == 1){
               // Check for only 1 input in string, otherwise you can spam inputs inside
               checkbox_header = checkbox_table = checkbox;
               checkbox_table = $(checkbox_table).find('input').addClass(rowClass).end().get(0).outerHTML;
            } else {
               checkbox_header = '<input type="checkbox">';
               checkbox_table = '<input type="checkbox" class="'+ rowClass +'">';
            }

            //
            // WORKAROUNDS:
            //
            // DataTables doesn't support natively ability to modify settings on the fly.
            // The following code is a workaround that deals with possible consequences.

            DataTable.ext.internal._fnApplyColumnDefs(ctx, [{
                  'targets': i,
                  'searchable': false,
                  'orderable': false,
                  'width': ctx.aoColumns[i].checkboxes.checkboxWidth,
                  'className': 'dt-body-center',
                  'render': function (data, type, full, meta){
                     if(type === 'display'){
                        data = checkbox_table;
                     }
                     return data;
                  }
               }], {}, function (iCol, oDef) {
                  DataTable.ext.internal._fnColumnOptions( ctx, iCol, oDef );
            });

            // Remove "sorting" class
            $colHeader.removeClass('sorting');

            // Detach all event handlers for this column
            $colHeader.off('.dt');


            //
            // DATA
            //

            // Initialize object holding data for selected checkboxes
            self.s.data[i] = {};

            // If state is loaded and contains data for this column
            if(state && state.checkboxes && state.checkboxes.hasOwnProperty(i)){
               // Load previous state
               self.s.data[i] = state.checkboxes[i];
            }

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

            if(ctx.aoColumns[i].checkboxes.selectAll){
               // Save previous HTML content
               $colHeader.data('html', $colHeader.html());

               $colHeader
                  .html(checkbox_header)
                  .addClass('dt-checkboxes-select-all')
                  .attr('data-col', i);
            }
         }
      }

      // If table has at least one checkbox
      if(hasCheckboxes){

         //
         // EVENT HANDLERS
         //

         var $table = $(dt.table().node());
         var $tableBody = $(dt.table().body());
         var $tableContainer = $(dt.table().container());

         // If there is at least one column that has row selection enabled
         if(hasCheckboxesSelectRow){
            $table.addClass('dt-checkboxes-select');

            // Handle row select/deselect event
            $table.on('select.dt.dtCheckboxes deselect.dt.dtCheckboxes', function(e, api, type, indexes){
               self.onSelect(e, type, indexes);
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

         // Handle Ajax request completion event
         $table.on('xhr.dt', function ( e, settings, json, xhr ) {
            // Retrieve stored state
            var state = dt.state.loaded();

            $.each(self.s.columns, function(index, colIdx){
               // Clear data
               self.s.data[colIdx] = {};

               // If state is loaded and contains data for this column
               if(state && state.checkboxes && state.checkboxes.hasOwnProperty(colIdx)){
                  // Load previous state
                  self.s.data[colIdx] = state.checkboxes[colIdx];
               }
            });

            // If state saving is enabled
            if(ctx.oFeatures.bStateSave){
               // If server-side processing mode is not enabled
               // NOTE: Needed to avoid duplicate call to updateCheckboxes() in onDraw()
               if(!ctx.oFeatures.bServerSide){
                  // Update table state on next redraw
                  $table.one('draw.dt.dtCheckboxes', function(e){
                     self.updateState();
                  });
               }
            }
         });

         // Handle table draw event
         $table.on('draw.dt.dtCheckboxes', function(e){
            self.onDraw(e);
         });

         // Handles checkbox click event
         $tableBody.on('click.dtCheckboxes', 'input.dt-checkboxes', function(e){
            self.onClick(e, this);
         });

         // Handle click on "Select all" control
         $tableContainer.on('click.dtCheckboxes', 'thead th.dt-checkboxes-select-all input[type="checkbox"]', function(e){
            self.onClickSelectAll(e, this);
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

         // Handle table initialization event
         $table.on('init.dt.dtCheckboxes', function(){

            // If state saving is enabled
            if(ctx.oFeatures.bStateSave){

               // If server-side processing mode is not enabled
               // NOTE: Needed to avoid duplicate call to updateCheckboxes() in onDraw()
               if(!ctx.oFeatures.bServerSide){
                  self.updateState();
               }

               // Handle state saving event
               $table.on('stateSaveParams.dt.dtCheckboxes', function (e, settings, data){
                  // Store data associated with this plug-in
                  data.checkboxes = self.s.data;
               });
            }
         });

         // Handle table destroy event
         $table.one('destroy.dt.dtCheckboxes', function(e, settings){
            // Detach event handlers
            $(document).off('click.dtCheckboxes');
            $tableContainer.on('.dtCheckboxes');
            $tableBody.off('.dtCheckboxes');
            $table.off('.dtCheckboxes');

            // Clear data
            //
            // NOTE: Needed only to reduce memory footprint
            // in case user saves instance of DataTable object.
            self.s.data = {};

            // Remove added elements
            $('.dt-checkboxes-select-all', $table).each(function(index, el){
               $(el)
                  .html($(el).data('html'))
                  .removeClass('dt-checkboxes-select-all');
            });
         });
      }
   },

   // Updates array holding data for selected checkboxes
   updateData: function(type, selector, isSelected, allowDups){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      // By default, duplicate data is not allowed
      if(typeof allowDups === 'undefined'){ allowDups = false; }

      var cellSelector;

      if(type === 'cell'){
         cellSelector = selector;

      } else if(type === 'row'){
         cellSelector = [];

         dt.rows(selector).every(function(rowIdx){
            // Get index of the first column that has checkbox and row selection enabled
            var colIdx = self.getSelectRowColIndex();
            if(colIdx !== null){
               cellSelector.push({ row: rowIdx, column: colIdx });
            }
         });
      }

      dt.cells(cellSelector).every(function (cellRow, cellCol) {
         // If Checkboxes extension is enabled for this column
         if(ctx.aoColumns[cellCol].checkboxes){
            // Get cell data
            var cellData = this.data();

            // Determine whether data is in the list
            var hasData = ctx.checkboxes.s.data[cellCol].hasOwnProperty(cellData);

            // If checkbox is checked and data is not in the list
            if(isSelected){
               // If data is available and duplicates are allowed
               if(hasData && allowDups){
                  ctx.checkboxes.s.data[cellCol][cellData]++;

               // Otherwise, if data is not available or duplicates are not allowed
               } else {
                  ctx.checkboxes.s.data[cellCol][cellData] = 1;
               }

            // Otherwise, if checkbox is not checked and data is in the list
            } else if (!isSelected && hasData){
               // If only data counter equals to 1 or duplicates are not allowed
               if(ctx.checkboxes.s.data[cellCol][cellData] === 1 || !allowDups){
                  delete ctx.checkboxes.s.data[cellCol][cellData];

               // Otherwise, if data counter is greater than 1 and duplicates are allowed
               } else {
                  ctx.checkboxes.s.data[cellCol][cellData]--;
               }
            }
         }
      });

       // If state saving is enabled
      if(ctx.oFeatures.bStateSave){
         // Save state
         dt.state.save();
      }
   },

   // Updates row selection
   updateSelect: function(type, selector, isSelected){
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
   updateCheckbox: function(type, selector, isSelected){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      var cellSelector = [];
      if(type === 'row'){
         dt.rows(selector).every(function(rowIdx){
            // Get index of the first column that has checkbox and row selection enabled
            var colIdx = self.getSelectRowColIndex();
            if(colIdx !== null){
               cellSelector.push({ row: rowIdx, column: colIdx });
            }
         });

      } else if(type === 'cell'){
         cellSelector = selector;

      }

      var nodes = dt.cells(cellSelector).nodes();
      if(nodes.length){
         $('input.dt-checkboxes', nodes).prop('checked', isSelected);

         // NOTE: For performance reasons assume that cellSelector is always
         // an array of objects with two properties: "row" and "column".
         var colIdx = cellSelector[0].column;

         // If selectCallback is a function
         if($.isFunction(ctx.aoColumns[colIdx].checkboxes.selectCallback)){
            ctx.aoColumns[colIdx].checkboxes.selectCallback(nodes, isSelected);
         }

         // If rowHighlight is enabled
         if(isSelected && !ctx._select && ctx.aoColumns[colIdx].checkboxes.rowHighlight){
            $(dt.$(nodes).closest('tr')).addClass('selected');
         } else {
            $(dt.$(nodes).closest('tr')).removeClass('selected');
         }
      }
   },

   // Update table state
   updateState: function(){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      self.updateCheckboxes({ page: 'all', search: 'none' });

      $.each(self.s.columns, function(index, colIdx){
         self.updateSelectAll(colIdx);
      });
   },

   // Updates state of multiple checkboxes
   updateCheckboxes: function(opts){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      // Enumerate all cells
      var dataSeen = {};
      dt.cells('tr', self.s.columns, opts).every(function(cellRow, cellCol){
         // Get cell data
         var cellData = this.data();

         // If data is in the list
         if(ctx.checkboxes.s.data[cellCol].hasOwnProperty(cellData)){
            // Determine how many times cell with given data was already selected
            if(dataSeen.hasOwnProperty(cellData)){
               dataSeen[cellData]++;
            } else {
               dataSeen[cellData] = 1;
            }

            // If cell needs to be selected
            if(dataSeen[cellData] <= ctx.checkboxes.s.data[cellCol][cellData]){
               self.updateCheckbox('cell', [{ row: cellRow, column: cellCol }], true);

               // If row selection is enabled
               if(ctx.aoColumns[cellCol].checkboxes.selectRow){
                  self.updateSelect('row', cellRow, true);
               }
            }
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

      // If cell is in a fixed column using FixedColumns extension
      if($cell.parents('.DTFC_Cloned').length){
         cellSelector = dt.fixedColumns().cellIndex($cell);

      } else {
         cellSelector = $cell;
      }

      var cell    = dt.cell(cellSelector);
      var cellIdx = cell.index();
      var colIdx  = cellIdx.column;

      // If row selection is not enabled
      // NOTE: if row selection is enabled, checkbox selection/deselection
      // would be handled by onSelect event instead
      if(!ctx.aoColumns[colIdx].checkboxes.selectRow){
         cell.checkboxes.select(ctrl.checked, true);

         // Prevent click event from propagating to parent
         e.stopPropagation();

      // Otherwise, if row selection is enabled
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
            var cellData = cell.data();

            // Determine whether data is in the list
            var hasData = self.s.data[colIdx].hasOwnProperty(cellData);

            // If state of the checkbox needs to be updated
            if(hasData !== ctrl.checked){
               self.updateCheckbox('cell', [cellIdx], hasData);
               self.updateSelectAll(colIdx);
            }
         }, 0);
      }
   },

   // Handles row select/deselect event
   onSelect: function(e, type, indexes){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      if(self.s.ignoreSelect){ return; }

      if(type === 'row'){
         // By default, allow duplicate data
         var allowDup = true;

         // WORKAROUND:
         // Select extension may generate multiple select events for the same row
         // when selecting rows using SHIFT key and the following styles are used
         // 'os', 'multi+shift'.
         //
         // If user is selecting/deselecting multiple rows using SHIFT key
         if((ctx._select.style === 'os' || ctx._select.style === 'multi+shift') && indexes.length > 1){
           // Disallow handling of rows with duplicate data
            allowDup = false;
         }

         self.updateData('row', indexes, (e.type === 'select') ? true : false, allowDup);
         self.updateCheckbox('row', indexes, (e.type === 'select') ? true : false);

         // Get index of the first column that has checkbox and row selection enabled
         var colIdx = self.getSelectRowColIndex();
         if(colIdx !== null){
            self.updateSelectAll(colIdx);
         }
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
         var cellIdx = dt.fixedColumns().cellIndex($th);
         colIdx = cellIdx.column;
      } else {
         colIdx = dt.column($th).index();
      }

      dt.column(colIdx, {
         page: (
            (ctx.aoColumns[colIdx].checkboxes && ctx.aoColumns[colIdx].checkboxes.selectAllPages)
            ? 'all'
            : 'current'
         ),
         search: 'applied'
      }).checkboxes.select(ctrl.checked, true);

      // Prevent click event from propagating to parent
      e.stopPropagation();
   },

   // Handles table draw event
   onDraw: function(e){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      // If server-side processing is enabled
      if(ctx.oFeatures.bServerSide){
         self.updateCheckboxes({ page: 'current', search: 'none' });
      }

      $.each(self.s.columns, function(index, colIdx){
         self.updateSelectAll(colIdx);
      });
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
         var $checkboxes = $('.dt-checkboxes', cells.nodes());
         var $checkboxesChecked = $checkboxes.filter(':checked');
         var $checkboxesSelectAll = $('.dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]', $tableContainer);

         // If FixedHeader is enabled in this instance
         if(ctx._fixedHeader){
            // If header is floating in this instance
            if(ctx._fixedHeader.dom['header'].floating){
               $checkboxesSelectAll = $('.fixedHeader-floating .dt-checkboxes-select-all[data-col="' + colIdx + '"] input[type="checkbox"]');
            }
         }

         var isSelected;
         var isIndeterminate;

         // If none of the checkboxes are checked
         if ($checkboxesChecked.length === 0) {
            isSelected      = false;
            isIndeterminate = false;

         // If all of the checkboxes are checked
         } else if ($checkboxesChecked.length === $checkboxes.length) {
            isSelected      = true;
            isIndeterminate = false;

         // If some of the checkboxes are checked
         } else {
            isSelected      = true;
            isIndeterminate = true;
         }

         $checkboxesSelectAll.prop({
            'checked': isSelected,
            'indeterminate': isIndeterminate
         });

         // If selectAllCallback is a function
         if($.isFunction(ctx.aoColumns[colIdx].checkboxes.selectAllCallback)){
            ctx.aoColumns[colIdx].checkboxes.selectAllCallback($checkboxesSelectAll.closest('th').get(0), isSelected, isIndeterminate);
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

      var $output  = $('<span class="select-info"/>');
      var add = function(name, num){
         $output.append( $('<span class="select-item"/>').append( dt.i18n(
            'select.'+name+'s',
            { _: '%d '+name+'s selected', 0: '', 1: '1 '+name+' selected' },
            num
         ) ) );
      };

      // Get index of the first column that has checkbox and row selection enabled
      var colIdx = self.getSelectRowColIndex();

      // If there is a column that has checkbox and row selection enabled
      if(colIdx !== null){
         // Count number of selected rows
         var countRows = 0;
         for (var cellData in ctx.checkboxes.s.data[colIdx]){
            if (ctx.checkboxes.s.data[colIdx].hasOwnProperty(cellData)){
               countRows += ctx.checkboxes.s.data[colIdx][cellData];
            }
         }

         add('row', countRows);

         // Internal knowledge of DataTables to loop over all information elements
         $.each( ctx.aanFeatures.i, function ( i, el ) {
            var $el = $(el);

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

   // Gets cell index
   getCellIndex: function(cell){
      var self = this;
      var dt = self.s.dt;
      var ctx = self.s.ctx;

      // If FixedColumns extension is available
      if(ctx._oFixedColumns){
         return dt.fixedColumns().cellIndex(cell);

      } else {
         return dt.cell(cell).index();
      }
   },

   // Gets index of the first column that has checkbox and row selection enabled
   getSelectRowColIndex: function(){
      var self = this;
      var dt = self.s.dt;
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
    * Row highlighting on checkbox without Select extension
    *
    * @type {Boolean}
    * @default  `false`
    */
   rowHighlight: false,

   /**
    * HTML code for Checkbox element
    *
    * @type {String}
    * @default'<input type="checkbox">'
    */
   checkboxElement: '<input type="checkbox">',

   /**
    * Width of Checkbox element
    *
    * @type {String}
    * @default  '1%'
    */
   checkboxWidth: '1%'
};


/*
 * API
 */
var Api = $.fn.dataTable.Api;

// Doesn't do anything - work around for a bug in DT... Not documented
Api.register( 'checkboxes()', function () {
   return this;
} );

Api.registerPlural( 'columns().checkboxes.select()', 'column().checkboxes.select()', function ( select, allowDups ) {
   if(typeof select === 'undefined'){ select = true; }

   return this.iterator( 'column-rows', function ( ctx, colIdx, i, j, rowsIdx ) {
      if(ctx.checkboxes){
         var selector = [];
         $.each(rowsIdx, function(index, rowIdx){
            selector.push({ row: rowIdx, column: colIdx });
         });

         ctx.checkboxes.updateData('cell', selector, (select) ? true : false, allowDups);
         ctx.checkboxes.updateCheckbox('cell', selector, (select) ? true : false);

         // If row selection is enabled
         if(ctx.aoColumns[colIdx].checkboxes.selectRow){
            ctx.checkboxes.updateSelect('row', rowsIdx, select);
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

Api.registerPlural( 'cells().checkboxes.select()', 'cell().checkboxes.select()', function ( select, allowDups ) {
   if(typeof select === 'undefined'){ select = true; }

   return this.iterator( 'cell', function ( ctx, rowIdx, colIdx ) {
      if(ctx.checkboxes){
         var selector = [{ row: rowIdx, column: colIdx }];

         ctx.checkboxes.updateData('cell', selector, (select) ? true : false, allowDups);
         ctx.checkboxes.updateCheckbox('cell', selector, (select) ? true : false);

         // If row selection is enabled
         if(ctx.aoColumns[colIdx].checkboxes.selectRow){
            ctx.checkboxes.updateSelect('row', rowIdx, select);
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

Api.registerPlural( 'columns().checkboxes.deselect()', 'column().checkboxes.deselect()', function ( allowDups ) {
   return this.checkboxes.select(false, allowDups);
} );

Api.registerPlural( 'cells().checkboxes.deselect()', 'cell().checkboxes.deselect()', function ( allowDups ) {
   return this.checkboxes.select(false, allowDups);
} );

Api.registerPlural( 'columns().checkboxes.deselectAll()', 'column().checkboxes.deselectAll()', function () {
   return this.iterator( 'column', function (ctx, colIdx){
      // If Checkboxes extension is enabled for this column
      if(ctx.aoColumns[colIdx].checkboxes){
         ctx.checkboxes.s.data[colIdx] = {};

         this.column(colIdx).checkboxes.select(false, false);
      }
   }, 1 );
} );

Api.registerPlural( 'columns().checkboxes.selected()', 'column().checkboxes.selected()', function () {
   return this.iterator( 'column', function (ctx, colIdx){
      if(ctx.aoColumns[colIdx].checkboxes){
         var data = [];

         $.each(ctx.checkboxes.s.data[colIdx], function(cellData, countRows){
            for(var i = 0; i < countRows; i++){
               data.push(cellData);
            }
         });

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
Checkboxes.version = '1.2.0-dev';



$.fn.DataTable.Checkboxes = Checkboxes;
$.fn.dataTable.Checkboxes = Checkboxes;


// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on( 'preInit.dt.dtCheckboxes', function (e, settings, json) {
   if ( e.namespace !== 'dt' ) {
      return;
   }

   new Checkboxes( settings );
} );


return Checkboxes;
}));
