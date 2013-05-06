(function(){
    $(document).ready(function(){
        $.getJSON('data/wanted/wanted_list.json', function(wanted){
            $.each(wanted, function(i, warrant){
                $.getJSON('data/wanted/' + warrant + '.json', function(person){
                    var rogueTemplate = new EJS({url: 'js/views/rogueTemplate.ejs'});
                    var rogue = rogueTemplate.render(person);
                    $('#wanted-list').append(rogue);
                }).fail(
                    function(resp){
                        console.log(resp)
                    }
                )
            })
        }).fail(
            function(resp){
                console.log(resp);
            }
        )
    });
})()
