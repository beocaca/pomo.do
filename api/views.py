from .serializers import *
from .models import *
from rest_framework import status, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.decorators import action
from django.http import Http404
import json

# This viewsets automatically provide `list`, `create`, `retrieve`,
# `update` and `destroy` actions.

# Create your views here.
# TODO: Convert to ListApiView for querying
class UserViewSet(viewsets.ModelViewSet):
  queryset = User.objects.all()
  permission_classes = [permissions.IsAuthenticated]
  serializer_class = UserSerializer

class TaskViewSet(viewsets.ModelViewSet):
  queryset = Task.objects.all()
  permission_classes = [permissions.IsAuthenticated]
  serializer_class = TaskSerializer

  def list(self, request):
    """
    List tasks specific to the user
    """
    tasks = Task.objects.filter(user=request.user, in_project=False)
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)

  def retrieve(self, request, pk=None):
    """
    Return a certain task info based on the
    authenticated user
    """
    task = Task.objects.filter(id=pk).first()
    if task.user != request.user:
      return Response({"data": "error"})
    return Response(TaskSerializer(task).data)

  def create(self, request):
    """
    Create a new task with tags and subtasks
    """
    serializer = TaskSerializer(data=request.data)
    subtasks = request.data['subtasks']
    tags = request.data['tags']
    
    if serializer.is_valid():
      task = Task(user=request.user, **serializer.data)
      task.save()

      # Add tags
      for tag in tags:
        tag_obj = Tag.objects.filter(name=tag['name']).first()
        if not tag_obj:
          # Create tag
          tag_obj = Tag.objects.create(name=tag['name'])
        task.tags.add(tag_obj)

      # Add subtasks
      for subtask in subtasks:
        Subtask.objects.create(task=task, **subtask)

      # Return the newly created task
      return Response(TaskSerializer(task).data)
    return Response({ 'message': 'error' })


  # Full update (PUT)


  # Partial update (PATCH)  
  def partial_update(self, request, pk=None):
    data = request.data
    if "obj" in data:
      obj = data['obj']
      # Live update tags
      if obj == 'tag':
        task = Task.objects.filter(id=pk).first()
        if data['action'] == 'remove':
          tag_id = data['tag_id']
          tag_obj = Tag.objects.get(id=tag_id)
          task.tags.remove(tag_obj)
          task.save()
          return Response({'message': f'tag removed'})
        if data['action'] == 'add':
          # Get or create the tag
          (tag_obj, is_new) = Tag.objects.get_or_create(name=data['tag_name'])
          # If tag already exists, check if tag is in obj already
          if not is_new and tag_obj in task.tags.all():
            return Response({'message': 'tag already exists in task'})

          # Add tag
          task.tags.add(tag_obj)
          task.save()
          
          serialized_tag = TagSerializer(tag_obj).data

          if is_new:
            return Response({
              'message': 'new',
              'tag': serialized_tag
            })
          return Response({'tag': serialized_tag})
      # Live update subtasks
      elif obj == 'subtask':
        task = Task.objects.get(id=pk)
        # Create subtask
        if data['action'] == 'add':
          subtask = data['subtask']
          subtask = Subtask.objects.create(task=task, **subtask)
          task.save()
          return Response(SubtaskSerializer(subtask).data)
        # Remove subtask
        elif data['action'] == 'remove':
          subtask_obj = Subtask.objects.get(id=data['subtask_id'])
          subtask_obj.delete()
          return Response({"message": "subtask removed"})
        # Update subtask
        elif data['action'] == 'update':
          subtask = data['subtask']
          subtask_obj = Subtask.objects.get(id=subtask['id'])
          serializer = SubtaskSerializer(subtask_obj, data=subtask)
          if serializer.is_valid():
            serializer.save()
          return Response({"message": "updated"}, status=status.HTTP_200_OK)
        elif data['action'] == 'done':
          subtask_obj = Subtask.objects.get(id=data['subtask_id'])
          subtask_obj.done = not subtask_obj.done
          subtask_obj.save()
          return Response({"done": subtask_obj.done})
      elif obj == 'task':
        if data['action'] == 'done':
          task = Task.objects.get(id=pk)
          task.done = not task.done
          task.save()
          return Response ({"done": task.done})
      return Response({'message': 'error'})


class TagViewSet(viewsets.ModelViewSet):
  queryset = Tag.objects.all()
  permission_classes = [permissions.IsAuthenticated]
  serializer_class = TagSerializer


class ProjectViewSet(viewsets.ModelViewSet):
  queryset = Project.objects.all()
  permission_classes = [permissions.IsAuthenticated]
  serializer_class = ProjectSerializer

  def get_object(self, pk):
    try:
      return Project.objects.get(id=pk)
    except Project.DoesNotExist:
      raise Http404

  def create(self, request):
    """
    Create a new Project with tasks
    """
    project = Project.objects.create(user=request.user, name=request.data['name'])
    
    for task in request.data['tasks']:
      task_obj = Task.objects.create(user=request.user, in_project=True, **task)
      project.tasks.add(task_obj)
      project.save()
    return Response(ProjectSerializer(project).data)


  def partial_update(self, request, pk=None):
    data = request.data

    if 'obj' in data:
      if data['obj'] == 'project':
        
        project = Project.objects.get(id=pk)

        if data['action'] == 'add_new':
          task = Task.objects.create(user=request.user, in_project=True, **data['task'])
          project.tasks.add(task)
          project.save()
          return Response(TaskSerializer(task).data)

        if data['action'] == 'add_to_project':
          task = Task.objects.get(id=data['task_id'])
          project.tasks.add(task)

        if data['action'] == 'update_task':
          task = Task.objects.get(id=data['subtask']['id'])
          serializer = TaskSerializer(task, data=data['subtask'])
          if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        if data['action'] == 'delete_task':
          task = Task.objects.get(id=data['task_id'])
          if not task.in_project:
            project = self.get_object(pk)
            project.tasks.remove(task)
            return Response("task removed")
          task.delete()
          return Response("task deleted")
          
        return Response("toggled")
  
  def destroy(self, request, pk=None):
    project = self.get_object(pk)

    for task in project.tasks.all():
      if task.in_project:
        task.delete()
    
    project.delete()
    return Response({'data': 'project deleted'})


class RegisterView(APIView):
  def post(self, request):
    username = request.data['username']
    password = request.data['password']

    user = User.objects.create_user(username=username, password=password)
    user.save()
    return Response({'message': 'success'})


class CurrentUserView(APIView):
  permission_classes = [permissions.IsAuthenticated]
  def get(self, request):
    return Response(UserSerializer(request.user).data)

# class TasksView(APIView):
#   def get(self, request):
#     """
#     List tasks specific to the user
#     """
#     tasks = Task.objects.filter(user=request.user)
#     serializer = TaskSerializer(tasks, many=True)
#     return Response(serializer.data)

# Current Task
class CurrentTaskView(APIView):
  def get(self, request):
    return Response({"id": 1})