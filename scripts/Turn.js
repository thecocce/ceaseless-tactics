// ----------------------------------------------------------------------------
// TURN LOGIC
// ----------------------------------------------------------------------------

var turn = {
  button_image : document.getElementById("img_button"),
  button_highlight_image : document.getElementById("img_button_highlight"),
  count : 1
}

turn.draw = function() {
  ctx.font = "30px Arial";
  ctx.textAlign = "right";
  
  if(turn.currentTeam)
  {
    ctx.fillText((turn.currentTeam.name + " turn " + turn.count + " / 6").firstToUpper(), ctx.canvas.width - 32, 64);

    ctx.drawImage(turn.buttonHovered 
      ? turn.button_highlight_image 
      : turn.button_image, 
      ctx.canvas.width - 228, 88, 196, 64);
    ctx.fillText("End turn?", ctx.canvas.width - 64, 128);
  }
  else
  {
    ctx.fillText("Resolution", ctx.canvas.width - 32, 64);
  }
}

turn.end = function() {
  if(!turn.currentTeam)
    return;

  cursor.clearSelection();

  var next_i = turn.currentTeam.i + 1;
  if(next_i >= Team.prototype.all.length) 
  {
    turn.currentTeam = null;
    turn.count++;
    next_i = 0;

    // sort units by speed
    var units = [];
    objects.map({ 
      orderBy : function(a, b) { 
        // resolve all charges first
        if(a.isCharging() && !b.isCharging())
          return -a.speed;
        else if(b.isCharging() && !a.isCharging())
          return b.speed;
        // resolve all retreats next
        else if(a.isRetreating() && !b.isRetreating())
          return -a.speed;
        // resolve all moves last
        else if(b.isRetreating() && !a.isRetreating())
          return b.speed;
        else
          return b.speed - a.speed; 
      },
      f : function(unit) { units.push(unit); }
    });

    babysitter.add(function*(dt) {
      for(var i = 0; i < units.length; i++)
      {
        var unit = units[i];

        if(unit.path.length > 0)
        {
          // wait for 1 second
          var start_t = Date.now();
          while(Date.now() - start_t < 300)  
            dt = yield undefined;
        }

        // pop path nodes as far as we can
        while(unit.path.length > 0)
        {
          // make sure it's actually possible to leave the current tile
          if(!unit.canLeave())
          {
            console.log("no escape");
            break;
          }

          // wait for 0.1 seconds
          var start_t = Date.now();
          while(Date.now() - start_t < 100)  
            dt = yield undefined;

          // move to the next tile
          var hex = unit.path.shift();
          if(unit.canEnter(hex) && (!unit.isInCombat(hex) || unit.isCharging()))
            unit.setHex(hex);
        }

        // interrupt actions at target destination
        if(unit.isInCombat() && unit.isCharging())
          unit.hex.mapToNeighbours(function(hex) {
            if(hex.contents && hex.contents.isInCombat() && !hex.contents.isRetreating())
              hex.contents.path.length = 0;
          });
    }
      turn.currentTeam = Team.prototype.all[next_i];
    });
  }
  else
    turn.currentTeam = Team.prototype.all[next_i];
}
